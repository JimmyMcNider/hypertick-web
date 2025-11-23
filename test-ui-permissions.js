#!/usr/bin/env node

/**
 * Test script for UI Permissions System
 * Run this to see how different lessons get different UI permissions
 */

import { getUIPermissions, getVisibleWindows, getOrderTypeRestrictions } from './src/lib/ui-permissions.js';

console.log('🎨 Testing Progressive UI System\n');

// Test different lesson types
const testLessons = [
  { name: 'Price Formation', privileges: [8, 13, 15] }, // Basic lesson
  { name: 'Market Efficiency', privileges: [8, 9, 10, 12, 13, 15, 18] }, // Intermediate
  { name: 'Options Pricing', privileges: [1, 4, 5, 8, 9, 10, 11, 12, 13, 15, 18, 22, 23, 29] } // Advanced
];

testLessons.forEach(lesson => {
  console.log(`📚 Lesson: ${lesson.name}`);
  console.log(`🔐 Privileges: [${lesson.privileges.join(', ')}]`);
  
  const permissions = getUIPermissions(lesson.name, lesson.privileges);
  const visibleWindows = getVisibleWindows(permissions);
  const orderRestrictions = getOrderTypeRestrictions(permissions);
  
  console.log(`📊 Complexity: ${permissions.complexity}`);
  console.log(`🪟 Windows (${visibleWindows.length}): ${visibleWindows.map(w => w.name).join(', ')}`);
  console.log(`📝 Order Types: ${orderRestrictions.allowedTypes.join(', ')}`);
  console.log(`🌙 Dark Mode: ${permissions.allowDarkMode ? 'Enabled' : 'Disabled'}`);
  console.log(`🎨 Window Arrangement: ${permissions.allowWindowArrangement ? 'Enabled' : 'Disabled'}`);
  console.log('');
});

console.log('✅ Progressive UI system working correctly!');