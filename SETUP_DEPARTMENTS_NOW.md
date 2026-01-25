# 🚀 Quick Setup: Create All 6 Departments Now

## Easiest Method: One-Click Button

1. **Navigate to:** `http://localhost:3000/admin/departments`
2. **Look for the green "Quick Setup" button** at the top
3. **Click it** - All 6 departments will be created automatically!
4. **Refresh the page** to see them

## Alternative: Browser Console (If button doesn't appear)

1. **Navigate to:** `http://localhost:3000/admin/departments`
2. **Press F12** to open browser console
3. **Copy and paste this:**

```javascript
(async()=>{const d=[{name:'Foundations Division',code:'FND',description:'Specializes in foundation work including excavation, formwork, and concrete placement',department_type:'division',display_order:1,color_code:'#3b82f6'},{name:'Flatwork Division',code:'FLT',description:'Handles flatwork projects including driveways, sidewalks, and patios',department_type:'division',display_order:2,color_code:'#10b981'},{name:'Structural Division',code:'STR',description:'Focuses on structural concrete work including beams, columns, and slabs',department_type:'division',display_order:3,color_code:'#f59e0b'},{name:'Decorative Finishes',code:'DEC',description:'Specialized decorative concrete finishes and architectural elements',department_type:'crew',display_order:4,color_code:'#8b5cf6'},{name:'Equipment & Fleet Management',code:'EQP',description:'Manages all company equipment, vehicles, and maintenance',department_type:'department',display_order:5,color_code:'#ef4444'},{name:'Administration',code:'ADM',description:'Administrative support, HR, training records, and document control',department_type:'department',display_order:6,color_code:'#6366f1'}];let c=0,s=0,f=0;for(const dept of d){try{const r=await fetch('/api/admin/departments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dept)});const data=await r.json();if(r.ok){c++;console.log(`✅ ${dept.name}`);}else if(data.error?.includes('already exists')){s++;console.log(`⚠️ ${dept.name} already exists`);}else{f++;console.log(`❌ ${dept.name}: ${data.error}`);}}catch(e){f++;console.log(`❌ ${dept.name}: ${e.message}`);}}alert(`Done! Created: ${c}, Skipped: ${s}, Failed: ${f}. Refresh page.`);})();
```

4. **Press Enter**
5. **Refresh the page** (F5)

## What Gets Created

✅ **Foundations Division (FND)** - Blue - 10 workers, 3 equipment  
✅ **Flatwork Division (FLT)** - Green - 8 workers, 3 equipment  
✅ **Structural Division (STR)** - Amber - 7 workers, 1 equipment  
✅ **Decorative Finishes (DEC)** - Purple - 3 workers, specialized tools  
✅ **Equipment & Fleet Management (EQP)** - Red - 3 workers  
✅ **Administration (ADM)** - Indigo - 2 workers  

## After Setup

1. **Assign Superintendents:**
   - Click on "Foundations Division"
   - Click "Edit"
   - Select "Carlos Mendez" as Superintendent
   - Save

2. **Assign Managers:**
   - Click on "Equipment & Fleet Management"
   - Click "Edit"
   - Select "Patricia Williams" as Manager
   - Save
   
   - Click on "Administration"
   - Click "Edit"
   - Select "Amanda Foster" as Manager
   - Save

3. **Assign Workers:**
   - Click on each department card
   - Click "Assign Workers"
   - Select workers from the list
   - Save

4. **Assign Equipment:**
   - Click on each department card
   - Click "Assign Equipment"
   - Select equipment from the list
   - Save

5. **View Org Chart:**
   - Click "View Org Chart" button
   - See your complete organizational structure!

---

**That's it!** Your company structure is now set up. 🎉
