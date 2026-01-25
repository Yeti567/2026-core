-- ============================================================================
-- EXTENDED JOB/TASK LIBRARY
-- ============================================================================
-- Comprehensive construction tasks organized by trade
-- ============================================================================

INSERT INTO job_task_library (company_id, task_code, name, description, trade, subtrade, complexity_level, estimated_duration_hours, required_competencies, required_certifications, required_ppe, required_permits, regulatory_references) VALUES

-- ============================================================================
-- CONCRETE TASKS
-- ============================================================================
(NULL, 'CONC-FOOT-001', 'Strip Footing Pour', 'Placement of concrete for continuous strip footings', 'concrete', 'Placement', 3, 4.00, ARRAY['Concrete Placement', 'Vibration Techniques'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Chemical-Resistant Gloves - Nitrile'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "96", "title": "Concrete Work"}]'),

(NULL, 'CONC-WALL-001', 'Foundation Wall Pour', 'Placement of concrete for foundation walls', 'concrete', 'Placement', 4, 6.00, ARRAY['Concrete Placement', 'Vibration Techniques', 'Pump Operation'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Chemical-Resistant Gloves - Nitrile'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "96", "title": "Concrete Work"}]'),

(NULL, 'CONC-COL-001', 'Column Pour', 'Placement of concrete for structural columns', 'concrete', 'Placement', 4, 3.00, ARRAY['Concrete Placement', 'Column Techniques'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "96", "title": "Concrete Work"}]'),

(NULL, 'CONC-DECK-001', 'Elevated Deck Pour', 'Placement of concrete for elevated slabs/decks', 'concrete', 'Placement', 4, 8.00, ARRAY['Concrete Placement', 'Pump Operation', 'Finishing'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "96", "title": "Concrete Work"}]'),

(NULL, 'CONC-FIN-001', 'Concrete Slab Finishing', 'Machine and hand finishing of concrete slabs', 'concrete', 'Finishing', 3, 6.00, ARRAY['Concrete Finishing', 'Power Trowel Operation'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Knee Pads'], ARRAY[], '[]'),

(NULL, 'CONC-FIN-002', 'Exposed Aggregate Finishing', 'Application of retarder and washing for exposed aggregate', 'concrete', 'Finishing', 3, 4.00, ARRAY['Exposed Aggregate Techniques', 'Timing'], ARRAY['WHMIS'], ARRAY['Safety Boots - Chemical Resistant', 'Safety Glasses', 'Chemical-Resistant Gloves - Nitrile'], ARRAY[], '[]'),

(NULL, 'CONC-SAW-001', 'Control Joint Sawing', 'Sawing control joints in concrete slabs', 'concrete', 'Sawing', 2, 4.00, ARRAY['Concrete Sawing', 'Joint Layout'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'N95 Respirator', 'Hearing Protection'], ARRAY[], '[{"regulation": "O. Reg. 490/09", "section": "4", "title": "Silica"}]'),

(NULL, 'CONC-CORE-001', 'Core Drilling', 'Diamond core drilling through concrete', 'concrete', 'Drilling', 3, 2.00, ARRAY['Core Drilling', 'Layout'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'N95 Respirator', 'Hearing Protection', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 490/09", "section": "4", "title": "Silica"}]'),

(NULL, 'CONC-PUMP-001', 'Concrete Pump Setup and Operation', 'Setup and operation of line pump or boom pump', 'concrete', 'Pumping', 4, 8.00, ARRAY['Pump Operation', 'Concrete Knowledge'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses'], ARRAY[], '[]'),

(NULL, 'CONC-CURE-001', 'Concrete Curing Application', 'Application of curing compound or wet cure methods', 'concrete', 'Curing', 2, 2.00, ARRAY['Curing Methods'], ARRAY['WHMIS'], ARRAY['Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[]'),

-- ============================================================================
-- FORMWORK TASKS
-- ============================================================================
(NULL, 'FORM-FOOT-001', 'Strip Footing Formwork', 'Building and setting forms for continuous footings', 'formwork', 'Footings', 2, 4.00, ARRAY['Formwork', 'Layout'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-WALL-001', 'Foundation Wall Formwork - Plywood', 'Building plywood forms for foundation walls', 'formwork', 'Walls', 3, 16.00, ARRAY['Formwork', 'Wall Forming'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-WALL-002', 'Foundation Wall Formwork - Gang Forms', 'Setting and bracing gang forms for foundation walls', 'formwork', 'Walls', 4, 8.00, ARRAY['Formwork', 'Gang Forms', 'Rigging'], ARRAY['WHMIS', 'Working at Heights', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-COL-001', 'Column Formwork', 'Building and setting column forms', 'formwork', 'Columns', 3, 4.00, ARRAY['Formwork', 'Column Forms'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-DECK-001', 'Slab/Deck Formwork', 'Building elevated slab formwork with shoring', 'formwork', 'Decks', 4, 24.00, ARRAY['Formwork', 'Deck Forming', 'Shoring'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-BEAM-001', 'Beam Formwork', 'Building and setting beam bottom and side forms', 'formwork', 'Beams', 4, 8.00, ARRAY['Formwork', 'Beam Forming'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-STAIR-001', 'Stair Formwork', 'Building formwork for cast-in-place stairs', 'formwork', 'Stairs', 4, 16.00, ARRAY['Formwork', 'Stair Layout'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85", "title": "Formwork"}]'),

(NULL, 'FORM-STRIP-001', 'Formwork Stripping - Walls', 'Stripping wall forms and cleaning for reuse', 'formwork', 'Stripping', 3, 6.00, ARRAY['Formwork', 'Stripping Procedures'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "93", "title": "Formwork Removal"}]'),

(NULL, 'FORM-STRIP-002', 'Formwork Stripping - Elevated Slabs', 'Stripping and reshoring elevated slab formwork', 'formwork', 'Stripping', 4, 16.00, ARRAY['Formwork', 'Reshoring'], ARRAY['WHMIS', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "93", "title": "Formwork Removal"}]'),

-- ============================================================================
-- STRUCTURAL STEEL TASKS
-- ============================================================================
(NULL, 'STEEL-COL-001', 'Steel Column Erection', 'Setting and plumbing structural steel columns', 'structural_steel', 'Erection', 5, 4.00, ARRAY['Steel Erection', 'Crane Signals', 'Rigging'], ARRAY['Working at Heights', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'SRL', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "103", "title": "Steel Erection"}]'),

(NULL, 'STEEL-BEAM-001', 'Steel Beam Erection', 'Setting and connecting structural steel beams', 'structural_steel', 'Erection', 5, 4.00, ARRAY['Steel Erection', 'Crane Signals', 'Bolt-Up'], ARRAY['Working at Heights', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'SRL', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "103", "title": "Steel Erection"}]'),

(NULL, 'STEEL-DECK-001', 'Metal Decking Installation', 'Installation of metal floor/roof decking', 'structural_steel', 'Decking', 4, 8.00, ARRAY['Decking Installation', 'Fall Protection'], ARRAY['Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'STEEL-BOLT-001', 'High-Strength Bolting', 'Installation and tensioning of high-strength bolts', 'structural_steel', 'Connections', 3, 4.00, ARRAY['Bolting Procedures', 'Torque Requirements'], ARRAY['Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'STEEL-WELD-001', 'Field Welding - Structural', 'Field welding of structural connections', 'structural_steel', 'Welding', 4, 8.00, ARRAY['Structural Welding', 'Weld Inspection'], ARRAY['CWB Certified', 'Working at Heights', 'WHMIS'], ARRAY['Welding Hood', 'Welding Jacket', 'Welding Gloves', 'Safety Boots', 'Full Body Harness', 'Half-Face Respirator'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "126", "title": "Welding"}]'),

(NULL, 'STEEL-JOIST-001', 'Open Web Steel Joist Installation', 'Installation of OWSJ on steel beams', 'structural_steel', 'Joists', 4, 8.00, ARRAY['Joist Installation', 'Bridging'], ARRAY['Working at Heights', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "103", "title": "Steel Erection"}]'),

-- ============================================================================
-- EXCAVATION TASKS
-- ============================================================================
(NULL, 'EXC-STRIP-001', 'Topsoil Stripping', 'Stripping and stockpiling topsoil from site', 'excavation', 'Site Prep', 2, 8.00, ARRAY['Excavator Operation', 'Grading'], ARRAY['Heavy Equipment Operation'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest'], ARRAY[], '[]'),

(NULL, 'EXC-MASS-001', 'Mass Excavation', 'Bulk excavation for building foundation', 'excavation', 'Excavation', 3, 24.00, ARRAY['Excavator Operation', 'Cut/Fill'], ARRAY['Heavy Equipment Operation'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "222", "title": "Excavations"}]'),

(NULL, 'EXC-TRENCH-002', 'Utility Trench Excavation', 'Excavation of trenches for underground utilities', 'excavation', 'Trenching', 4, 8.00, ARRAY['Excavation', 'Shoring', 'Utility Locates'], ARRAY['Heavy Equipment Operation', 'Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "222", "title": "Excavations"}]'),

(NULL, 'EXC-SHORE-001', 'Trench Shoring Installation', 'Installation of trench boxes or shoring systems', 'excavation', 'Shoring', 4, 4.00, ARRAY['Shoring Installation', 'Soil Classification'], ARRAY['Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "234", "title": "Shoring"}]'),

(NULL, 'EXC-BACK-001', 'Backfill and Compaction', 'Backfilling excavations with compaction', 'excavation', 'Backfill', 3, 8.00, ARRAY['Backfill Procedures', 'Compaction'], ARRAY['Heavy Equipment Operation'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Hearing Protection'], ARRAY[], '[]'),

(NULL, 'EXC-GRADE-001', 'Finish Grading', 'Final grading to design elevations', 'excavation', 'Grading', 3, 8.00, ARRAY['Grading', 'Layout'], ARRAY['Heavy Equipment Operation'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest'], ARRAY[], '[]'),

(NULL, 'EXC-ROCK-001', 'Rock Excavation', 'Removal of rock by blasting or mechanical means', 'excavation', 'Rock', 5, 16.00, ARRAY['Rock Removal', 'Blasting'], ARRAY['Blaster License'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Hearing Protection'], ARRAY['Blasting Permit'], '[]'),

-- ============================================================================
-- ROOFING TASKS
-- ============================================================================
(NULL, 'ROOF-FLAT-002', 'Built-Up Roofing Application', 'Installation of BUR (tar and gravel) roofing', 'roofing', 'Flat Roof', 4, 16.00, ARRAY['Hot Roofing', 'Kettle Operation'], ARRAY['Working at Heights', 'Propane Safety', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Leather Work Gloves', 'Face Shield'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'ROOF-MOD-001', 'Modified Bitumen Roofing', 'Torch-applied modified bitumen roofing', 'roofing', 'Flat Roof', 4, 12.00, ARRAY['Torch Roofing', 'Membrane Application'], ARRAY['Working at Heights', 'Propane Safety', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Leather Work Gloves'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'ROOF-SING-001', 'Single-Ply Membrane Roofing', 'Installation of TPO, EPDM, or PVC membrane', 'roofing', 'Flat Roof', 3, 12.00, ARRAY['Membrane Roofing', 'Seaming'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'ROOF-SHIN-001', 'Asphalt Shingle Installation', 'Installation of asphalt shingles on sloped roofs', 'roofing', 'Sloped Roof', 3, 16.00, ARRAY['Shingle Installation'], ARRAY['Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'ROOF-METAL-001', 'Standing Seam Metal Roofing', 'Installation of standing seam metal roof panels', 'roofing', 'Metal Roof', 4, 16.00, ARRAY['Metal Roofing', 'Panel Installation'], ARRAY['Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Cut-Resistant Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'ROOF-INS-001', 'Roof Insulation Installation', 'Installation of rigid insulation on flat roofs', 'roofing', 'Insulation', 2, 8.00, ARRAY['Insulation Installation'], ARRAY['Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

-- ============================================================================
-- ELECTRICAL TASKS
-- ============================================================================
(NULL, 'ELEC-ROUGH-001', 'Rough-In Wiring - Residential', 'Installation of electrical boxes and wiring in wood frame', 'electrical', 'Rough-In', 3, 16.00, ARRAY['Electrical Installation', 'Code Requirements'], ARRAY['Licensed Electrician', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots'], ARRAY[], '[]'),

(NULL, 'ELEC-ROUGH-002', 'Rough-In Wiring - Commercial', 'Installation of conduit and wiring in commercial buildings', 'electrical', 'Rough-In', 4, 24.00, ARRAY['Conduit Installation', 'Wire Pulling'], ARRAY['Licensed Electrician', 'Working at Heights', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Hard Hat', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "181", "title": "Electrical"}]'),

(NULL, 'ELEC-SERV-001', 'Service Entrance Installation', 'Installation of electrical service entrance', 'electrical', 'Service', 4, 8.00, ARRAY['Service Installation', 'Metering'], ARRAY['Licensed Electrician', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots - Electrical Hazard', 'Insulated Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "181", "title": "Electrical"}]'),

(NULL, 'ELEC-TRANS-001', 'Transformer Installation', 'Installation of pad-mount or pole-mount transformers', 'electrical', 'Service', 5, 8.00, ARRAY['Transformer Installation', 'High Voltage'], ARRAY['Licensed Electrician', 'Rigging'], ARRAY['Safety Glasses', 'Safety Boots - Electrical Hazard', 'Insulated Gloves', 'Hard Hat'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "181", "title": "Electrical"}]'),

(NULL, 'ELEC-FIN-001', 'Device Installation', 'Installation of switches, receptacles, fixtures', 'electrical', 'Finish', 2, 8.00, ARRAY['Device Installation'], ARRAY['Licensed Electrician', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots'], ARRAY[], '[]'),

(NULL, 'ELEC-TEST-001', 'Electrical Testing and Commissioning', 'Testing and energizing electrical systems', 'electrical', 'Testing', 4, 8.00, ARRAY['Electrical Testing', 'Commissioning'], ARRAY['Licensed Electrician'], ARRAY['Safety Glasses', 'Safety Boots - Electrical Hazard', 'Insulated Gloves', 'FR Coveralls', 'Face Shield'], ARRAY[], '[{"regulation": "CSA Z462", "section": "4", "title": "Arc Flash"}]'),

-- ============================================================================
-- PLUMBING TASKS
-- ============================================================================
(NULL, 'PLMB-ROUGH-001', 'Underground Plumbing Rough-In', 'Installation of below-slab drainage', 'plumbing', 'Underground', 3, 16.00, ARRAY['Drainage Installation', 'Grade Setting'], ARRAY['Licensed Plumber', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'PLMB-ROUGH-002', 'Above-Grade Plumbing Rough-In', 'Installation of DWV and water supply piping', 'plumbing', 'Rough-In', 3, 24.00, ARRAY['Pipe Installation', 'Soldering'], ARRAY['Licensed Plumber', 'Working at Heights', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Safety Gloves', 'Full Body Harness'], ARRAY[], '[]'),

(NULL, 'PLMB-FIX-001', 'Fixture Installation', 'Installation of plumbing fixtures', 'plumbing', 'Finish', 2, 8.00, ARRAY['Fixture Installation'], ARRAY['Licensed Plumber'], ARRAY['Safety Glasses', 'Safety Boots', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'PLMB-WELD-001', 'Pipe Welding', 'Welding of steel or stainless steel piping', 'plumbing', 'Welding', 4, 8.00, ARRAY['Pipe Welding'], ARRAY['CWB Certified', 'WHMIS'], ARRAY['Welding Hood', 'Welding Jacket', 'Welding Gloves', 'Safety Boots', 'Half-Face Respirator'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "126", "title": "Welding"}]'),

-- ============================================================================
-- HVAC TASKS
-- ============================================================================
(NULL, 'HVAC-DUCT-001', 'Ductwork Installation', 'Installation of sheet metal ductwork', 'hvac', 'Ductwork', 3, 16.00, ARRAY['Duct Installation', 'Sheet Metal'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Cut-Resistant Gloves', 'Full Body Harness'], ARRAY[], '[]'),

(NULL, 'HVAC-EQUIP-001', 'RTU Installation', 'Installation of rooftop HVAC units', 'hvac', 'Equipment', 4, 8.00, ARRAY['Equipment Installation', 'Rigging'], ARRAY['Working at Heights', 'Rigging', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'HVAC-REF-001', 'Refrigerant Piping Installation', 'Installation of refrigerant lines', 'hvac', 'Refrigeration', 4, 8.00, ARRAY['Refrigerant Piping', 'Brazing'], ARRAY['TSSA Refrigeration', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'HVAC-BAL-001', 'Air Balancing', 'Testing and balancing of HVAC systems', 'hvac', 'Testing', 3, 16.00, ARRAY['Air Balancing', 'Testing'], ARRAY['WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Hard Hat'], ARRAY[], '[]'),

-- ============================================================================
-- MASONRY TASKS
-- ============================================================================
(NULL, 'MAS-BLOCK-001', 'CMU Wall Construction', 'Laying concrete masonry units for walls', 'masonry', 'Block', 3, 16.00, ARRAY['Masonry', 'Block Laying'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'MAS-BRICK-001', 'Brick Veneer Installation', 'Installation of brick veneer on buildings', 'masonry', 'Brick', 3, 24.00, ARRAY['Masonry', 'Brick Laying'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves', 'Full Body Harness'], ARRAY[], '[]'),

(NULL, 'MAS-STONE-001', 'Natural Stone Installation', 'Installation of natural stone veneer', 'masonry', 'Stone', 4, 24.00, ARRAY['Stone Masonry', 'Layout'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves', 'Full Body Harness'], ARRAY[], '[]'),

-- ============================================================================
-- CARPENTRY TASKS
-- ============================================================================
(NULL, 'CARP-FRAME-001', 'Wall Framing - Wood', 'Framing wood stud walls', 'carpentry', 'Framing', 3, 16.00, ARRAY['Framing', 'Blueprint Reading'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[]'),

(NULL, 'CARP-FRAME-002', 'Floor Framing', 'Installation of floor joists and subfloor', 'carpentry', 'Framing', 3, 16.00, ARRAY['Floor Framing', 'Layout'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness'], ARRAY[], '[]'),

(NULL, 'CARP-ROOF-001', 'Roof Framing', 'Installation of rafters or trusses', 'carpentry', 'Framing', 4, 16.00, ARRAY['Roof Framing', 'Truss Installation'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'CARP-TRIM-001', 'Interior Trim Installation', 'Installation of baseboard, casing, crown molding', 'carpentry', 'Finish', 2, 16.00, ARRAY['Finish Carpentry', 'Trim Installation'], ARRAY['WHMIS'], ARRAY['Safety Glasses', 'Safety Boots'], ARRAY[], '[]'),

(NULL, 'CARP-CAB-001', 'Cabinet Installation', 'Installation of kitchen and bath cabinets', 'carpentry', 'Finish', 3, 8.00, ARRAY['Cabinet Installation'], ARRAY['WHMIS'], ARRAY['Safety Glasses', 'Safety Boots', 'Safety Gloves'], ARRAY[], '[]'),

-- ============================================================================
-- DEMOLITION TASKS
-- ============================================================================
(NULL, 'DEMO-INT-001', 'Interior Demolition', 'Removal of interior partitions and finishes', 'demolition', 'Interior', 3, 16.00, ARRAY['Demolition', 'Hazmat Awareness'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'N95 Respirator', 'Safety Gloves', 'Hi-Vis Vest'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "200", "title": "Demolition"}]'),

(NULL, 'DEMO-CONC-001', 'Concrete Demolition', 'Breaking and removal of concrete structures', 'demolition', 'Structural', 4, 24.00, ARRAY['Concrete Demolition', 'Heavy Equipment'], ARRAY['Heavy Equipment Operation', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'N95 Respirator', 'Hearing Protection', 'Safety Gloves', 'Hi-Vis Vest'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "200", "title": "Demolition"}, {"regulation": "O. Reg. 490/09", "section": "4", "title": "Silica"}]'),

(NULL, 'DEMO-ASBES-001', 'Asbestos Abatement', 'Removal of asbestos-containing materials', 'demolition', 'Hazmat', 5, 40.00, ARRAY['Asbestos Abatement', 'Containment'], ARRAY['Asbestos Worker License', 'WHMIS'], ARRAY['Full-Face Respirator', 'Tyvek Suit', 'Safety Boots', 'Safety Gloves'], ARRAY['Asbestos Removal Permit'], '[{"regulation": "O. Reg. 278/05", "section": "All", "title": "Asbestos"}]'),

-- ============================================================================
-- SCAFFOLDING TASKS
-- ============================================================================
(NULL, 'SCAF-TUBE-001', 'Tube and Clamp Scaffold Erection', 'Erection of tube and clamp scaffolding', 'scaffolding', 'Tube & Clamp', 4, 16.00, ARRAY['Scaffold Erection', 'Fall Protection'], ARRAY['Working at Heights', 'Scaffold Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "125", "title": "Scaffolds"}]'),

(NULL, 'SCAF-SYS-001', 'System Scaffold Erection', 'Erection of modular system scaffolding', 'scaffolding', 'System', 4, 12.00, ARRAY['Scaffold Erection', 'Fall Protection'], ARRAY['Working at Heights', 'Scaffold Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "125", "title": "Scaffolds"}]'),

(NULL, 'SCAF-SUSP-001', 'Suspended Scaffold Setup', 'Setup of swing stage or suspended scaffold', 'scaffolding', 'Suspended', 5, 8.00, ARRAY['Suspended Scaffold', 'Rigging'], ARRAY['Working at Heights', 'Suspended Access'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Rope Grab', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "137", "title": "Suspended Scaffolds"}]'),

-- ============================================================================
-- CRANE/RIGGING TASKS
-- ============================================================================
(NULL, 'CRANE-SET-001', 'Tower Crane Setup', 'Erection and commissioning of tower crane', 'crane_rigging', 'Tower Crane', 5, 40.00, ARRAY['Crane Erection', 'Rigging'], ARRAY['Licensed Crane Operator', 'Rigging', 'Working at Heights'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Hi-Vis Vest', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "159", "title": "Tower Cranes"}]'),

(NULL, 'CRANE-LIFT-001', 'Critical Lift Planning and Execution', 'Planning and executing critical lifts', 'crane_rigging', 'Lifting', 5, 8.00, ARRAY['Lift Planning', 'Rigging', 'Load Charts'], ARRAY['Licensed Crane Operator', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Safety Gloves'], ARRAY['Critical Lift Permit'], '[{"regulation": "O. Reg. 213/91", "section": "150", "title": "Cranes"}]'),

(NULL, 'RIG-PREP-001', 'Rigging and Load Preparation', 'Selection and attachment of rigging hardware', 'crane_rigging', 'Rigging', 4, 2.00, ARRAY['Rigging', 'Hardware Selection'], ARRAY['Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "172", "title": "Rigging"}]')

ON CONFLICT DO NOTHING;
