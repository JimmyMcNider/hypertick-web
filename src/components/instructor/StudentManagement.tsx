'use client';

import React, { useState, useRef } from 'react';
import { UserPlusIcon, TrashIcon, AcademicCapIcon, DocumentArrowDownIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
}

interface Student {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentDate: Date;
  isActive: boolean;
  lastLogin?: Date;
  canvasId?: string;
}

interface StudentManagementProps {
  user: User | null;
  classId: string;
}

interface CanvasStudent {
  user_id: string;
  login_id: string;
  first_name: string;
  last_name: string;
  email: string;
  sis_user_id?: string;
}

export default function StudentManagement({ user, classId }: StudentManagementProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newStudent, setNewStudent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: ''
  });
  const [importData, setImportData] = useState('');
  const [importFormat, setImportFormat] = useState<'canvas_csv' | 'canvas_json' | 'manual_csv'>('canvas_csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/classes/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (classId) {
      fetchStudents();
    }
  }, [classId]);

  const handleAddStudent = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          students: [newStudent]
        })
      });

      if (response.ok) {
        await fetchStudents();
        setNewStudent({ firstName: '', lastName: '', email: '', username: '' });
        setShowAddModal(false);
      } else {
        const error = await response.json();
        alert('Error adding student: ' + error.error);
      }
    } catch (error) {
      alert('Error adding student: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleBulkImport = async () => {
    try {
      let students: any[] = [];

      if (importFormat === 'canvas_csv') {
        students = parseCanvasCSV(importData);
      } else if (importFormat === 'canvas_json') {
        students = parseCanvasJSON(importData);
      } else if (importFormat === 'manual_csv') {
        students = parseManualCSV(importData);
      }

      if (students.length === 0) {
        alert('No valid student data found');
        return;
      }

      const response = await fetch(`/api/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          students,
          source: importFormat
        })
      });

      if (response.ok) {
        const result = await response.json();
        await fetchStudents();
        setImportData('');
        setShowImportModal(false);
        alert(`Successfully imported ${result.imported} students (${result.skipped} skipped)`);
      } else {
        const error = await response.json();
        alert('Error importing students: ' + error.error);
      }
    } catch (error) {
      alert('Error parsing import data: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const parseCanvasCSV = (csvData: string): any[] => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const students = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const student: any = {};

      headers.forEach((header, index) => {
        if (values[index]) {
          switch (header) {
            case 'student':
            case 'name':
              const nameParts = values[index].split(' ');
              student.firstName = nameParts[0] || '';
              student.lastName = nameParts.slice(1).join(' ') || '';
              break;
            case 'id':
            case 'user id':
            case 'canvas_user_id':
              student.canvasId = values[index];
              break;
            case 'sis user id':
            case 'sis_user_id':
            case 'login id':
              student.username = values[index];
              break;
            case 'email':
            case 'email address':
              student.email = values[index];
              break;
            case 'first name':
            case 'first_name':
              student.firstName = values[index];
              break;
            case 'last name':
            case 'last_name':
              student.lastName = values[index];
              break;
          }
        }
      });

      if (student.firstName && student.lastName) {
        if (!student.username && student.email) {
          student.username = student.email.split('@')[0];
        }
        if (!student.email && student.username) {
          student.email = `${student.username}@university.edu`;
        }
        students.push(student);
      }
    }

    return students;
  };

  const parseCanvasJSON = (jsonData: string): any[] => {
    try {
      const data = JSON.parse(jsonData);
      const students = [];

      // Handle Canvas API response format
      if (Array.isArray(data)) {
        for (const item of data) {
          const student: any = {
            firstName: item.user?.name?.split(' ')[0] || item.first_name || '',
            lastName: item.user?.name?.split(' ').slice(1).join(' ') || item.last_name || '',
            email: item.user?.email || item.email || '',
            username: item.user?.login_id || item.login_id || item.sis_user_id || '',
            canvasId: item.user?.id || item.user_id || item.id
          };

          if (!student.username && student.email) {
            student.username = student.email.split('@')[0];
          }

          if (student.firstName && student.lastName) {
            students.push(student);
          }
        }
      }

      return students;
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  };

  const parseManualCSV = (csvData: string): any[] => {
    const lines = csvData.trim().split('\n');
    const students = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        const student = {
          firstName: parts[0],
          lastName: parts[1],
          email: parts[2],
          username: parts[3] || parts[2].split('@')[0]
        };
        students.push(student);
      }
    }

    return students;
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setImportData(text);
      
      // Auto-detect format based on file content
      if (file.name.endsWith('.json')) {
        setImportFormat('canvas_json');
      } else if (text.includes('Canvas') || text.includes('canvas') || text.includes('user id')) {
        setImportFormat('canvas_csv');
      } else {
        setImportFormat('manual_csv');
      }
    } catch (error) {
      alert('Error reading file: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleRemoveStudents = async () => {
    if (selectedStudents.size === 0) return;

    const confirmed = confirm(`Remove ${selectedStudents.size} student(s) from this class?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/classes/${classId}/students`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedStudents)
        })
      });

      if (response.ok) {
        await fetchStudents();
        setSelectedStudents(new Set());
      } else {
        const error = await response.json();
        alert('Error removing students: ' + error.error);
      }
    } catch (error) {
      alert('Error removing students: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === students.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)));
    }
  };

  const generateSampleTemplate = () => {
    const template = `First Name,Last Name,Email,Username
John,Doe,john.doe@university.edu,johndoe
Jane,Smith,jane.smith@university.edu,janesmith
Mike,Johnson,mike.johnson@university.edu,mikej`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600">Manage class enrollment and student access</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={generateSampleTemplate}
            className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            <span>Download Template</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <DocumentArrowUpIcon className="h-4 w-4" />
            <span>Import Students</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlusIcon className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-blue-600">{students.length}</div>
          <div className="text-sm text-gray-600">Total Students</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-600">
            {students.filter(s => s.isActive).length}
          </div>
          <div className="text-sm text-gray-600">Active Students</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {students.filter(s => s.lastLogin).length}
          </div>
          <div className="text-sm text-gray-600">Students Logged In</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-purple-600">
            {selectedStudents.size}
          </div>
          <div className="text-sm text-gray-600">Selected</div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Enrolled Students</h3>
            {selectedStudents.size > 0 && (
              <button
                onClick={handleRemoveStudents}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
              >
                <TrashIcon className="h-4 w-4" />
                <span>Remove Selected ({selectedStudents.size})</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedStudents.size === students.length && students.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No students enrolled. Import students or add them manually.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedStudents);
                          if (e.target.checked) {
                            newSelected.add(student.id);
                          } else {
                            newSelected.delete(student.id);
                          }
                          setSelectedStudents(newSelected);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <AcademicCapIcon className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                          {student.canvasId && (
                            <div className="text-xs text-gray-500">Canvas ID: {student.canvasId}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.lastLogin 
                        ? new Date(student.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.enrollmentDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={newStudent.firstName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={newStudent.lastName}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={newStudent.username}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Students</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Import Format</label>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="canvas_csv">Canvas CSV Export</option>
                  <option value="canvas_json">Canvas JSON API</option>
                  <option value="manual_csv">Manual CSV (First,Last,Email,Username)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={importFormat === 'canvas_csv' 
                    ? 'Paste Canvas CSV data here...'
                    : importFormat === 'canvas_json'
                    ? 'Paste Canvas API JSON response here...'
                    : 'John,Doe,john.doe@university.edu,johndoe\nJane,Smith,jane.smith@university.edu,janesmith'
                  }
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!importData.trim()}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Import Students
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}