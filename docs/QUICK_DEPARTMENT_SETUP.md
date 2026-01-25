# Quick Department Setup Guide

## Fastest Way to Set Up All 6 Departments

### Step 1: Navigate to Departments Page
Go to: `http://localhost:3000/admin/departments`
(Make sure you're logged in as an admin)

### Step 2: Open Browser Console
Press `F12` or right-click → Inspect → Console tab

### Step 3: Copy & Paste This Script

```javascript
(async function setupDepartments() {
  console.log('🚀 Setting Up Departments...');
  const departments = [
    {name:'Foundations Division',code:'FND',description:'Specializes in foundation work including excavation, formwork, and concrete placement',department_type:'division',display_order:1,color_code:'#3b82f6'},
    {name:'Flatwork Division',code:'FLT',description:'Handles flatwork projects including driveways, sidewalks, and patios',department_type:'division',display_order:2,color_code:'#10b981'},
    {name:'Structural Division',code:'STR',description:'Focuses on structural concrete work including beams, columns, and slabs',department_type:'division',display_order:3,color_code:'#f59e0b'},
    {name:'Decorative Finishes',code:'DEC',description:'Specialized decorative concrete finishes and architectural elements',department_type:'crew',display_order:4,color_code:'#8b5cf6'},
    {name:'Equipment & Fleet Management',code:'EQP',description:'Manages all company equipment, vehicles, and maintenance',department_type:'department',display_order:5,color_code:'#ef4444'},
    {name:'Administration',code:'ADM',description:'Administrative support, HR, training records, and document control',department_type:'department',display_order:6,color_code:'#6366f1'}
  ];
  for(const d of departments){try{const r=await fetch('/api/admin/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});const data=await r.json();console.log(r.ok?`✅ ${d.name}`:`❌ ${d.name}: ${data.error}`);}catch(e){console.log(`❌ ${d.name}: ${e.message}`);}}
  console.log('✅ Done! Refresh the page to see departments.');
})();
```

### Step 4: Press Enter
The script will create all 6 departments automatically.

### Step 5: Refresh the Page
Press `F5` to refresh and see your new departments.

## What Gets Created

1. **Foundations Division (FND)** - Blue
2. **Flatwork Division (FLT)** - Green  
3. **Structural Division (STR)** - Amber
4. **Decorative Finishes (DEC)** - Purple
5. **Equipment & Fleet Management (EQP)** - Red
6. **Administration (ADM)** - Indigo

## Next Steps After Creation

1. **Assign Superintendents/Managers:**
   - Click on each department card
   - Click "Edit"
   - Select superintendent/manager from dropdown
   - Save

2. **Assign Workers:**
   - Click on a department card to expand
   - Click "Assign Workers"
   - Select workers from the list
   - Save

3. **Assign Equipment:**
   - Click on a department card to expand
   - Click "Assign Equipment"
   - Select equipment from the list
   - Save

4. **View Org Chart:**
   - Click "View Org Chart" button
   - See your organizational structure

## Alternative: Use the Full Script File

If you prefer, you can also use the full script:
```bash
# Copy scripts/setup-departments-browser.js content
# Paste into browser console
```

## Troubleshooting

**"Unauthorized" Error:**
- Make sure you're logged in as an admin
- Refresh the page and try again

**"Already exists" Warning:**
- Department already created, that's fine
- You can edit it if needed

**"Server not running":**
- Start the dev server: `npm run dev`
- Wait for it to be ready
- Then run the script
