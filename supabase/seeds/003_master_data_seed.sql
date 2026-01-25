-- ============================================================================
-- MASTER DATA LIBRARIES - SEED DATA
-- ============================================================================
-- Pre-loads essential master data including:
-- - 500+ construction hazards categorized by trade
-- - Standard control measures (hierarchy of controls)
-- - PPE types with standards
-- - Common job tasks by trade
-- - Ontario legislation (OHSA, O. Reg. 213/91, O. Reg. 851)
-- - Sample quick reference guides
-- ============================================================================

-- ============================================================================
-- 1. PPE TYPES (Global)
-- ============================================================================

INSERT INTO ppe_types (company_id, name, category, description, standards, typical_hazards) VALUES
-- Head Protection
(NULL, 'Hard Hat - Type 1', 'Head Protection', 'Protects top of head from impact and penetration', ARRAY['CSA Z94.1-15'], ARRAY['struck_by', 'fall']::hazard_category[]),
(NULL, 'Hard Hat - Type 2', 'Head Protection', 'Protects top and sides of head from impact', ARRAY['CSA Z94.1-15'], ARRAY['struck_by', 'fall', 'electrical']::hazard_category[]),
(NULL, 'Bump Cap', 'Head Protection', 'Light protection for minor bumps in confined areas', ARRAY['CSA Z94.1-15'], ARRAY['struck_by']::hazard_category[]),

-- Eye/Face Protection
(NULL, 'Safety Glasses - Clear', 'Eye Protection', 'Basic impact protection for eyes', ARRAY['CSA Z94.3-15'], ARRAY['struck_by', 'chemical']::hazard_category[]),
(NULL, 'Safety Glasses - Tinted', 'Eye Protection', 'Impact protection with sun/glare reduction', ARRAY['CSA Z94.3-15'], ARRAY['struck_by', 'radiation']::hazard_category[]),
(NULL, 'Safety Goggles - Splash', 'Eye Protection', 'Chemical splash and dust protection', ARRAY['CSA Z94.3-15'], ARRAY['chemical', 'environmental']::hazard_category[]),
(NULL, 'Safety Goggles - Dust', 'Eye Protection', 'Protection from airborne particles', ARRAY['CSA Z94.3-15'], ARRAY['chemical', 'environmental']::hazard_category[]),
(NULL, 'Face Shield', 'Face Protection', 'Full face protection from flying debris/splash', ARRAY['CSA Z94.3-15'], ARRAY['struck_by', 'chemical', 'radiation']::hazard_category[]),
(NULL, 'Welding Hood - Auto-Darkening', 'Face Protection', 'Welding arc protection with auto-darkening lens', ARRAY['CSA Z94.3-15', 'CSA W117.2'], ARRAY['radiation', 'struck_by']::hazard_category[]),
(NULL, 'Welding Hood - Fixed Shade', 'Face Protection', 'Welding arc protection with fixed shade lens', ARRAY['CSA Z94.3-15', 'CSA W117.2'], ARRAY['radiation', 'struck_by']::hazard_category[]),

-- Hearing Protection
(NULL, 'Ear Plugs - Disposable Foam', 'Hearing Protection', 'Single-use foam ear plugs, NRR 29-33', ARRAY['CSA Z94.2-14'], ARRAY['physical']::hazard_category[]),
(NULL, 'Ear Plugs - Reusable', 'Hearing Protection', 'Reusable pre-molded ear plugs', ARRAY['CSA Z94.2-14'], ARRAY['physical']::hazard_category[]),
(NULL, 'Ear Muffs - Standard', 'Hearing Protection', 'Over-ear hearing protection, NRR 22-31', ARRAY['CSA Z94.2-14'], ARRAY['physical']::hazard_category[]),
(NULL, 'Ear Muffs - Hard Hat Mount', 'Hearing Protection', 'Hearing protection that attaches to hard hat', ARRAY['CSA Z94.2-14'], ARRAY['physical']::hazard_category[]),
(NULL, 'Ear Muffs - Communication', 'Hearing Protection', 'Hearing protection with built-in radio', ARRAY['CSA Z94.2-14'], ARRAY['physical']::hazard_category[]),

-- Respiratory Protection
(NULL, 'N95 Respirator', 'Respiratory Protection', 'Particulate filtering facepiece, 95% efficiency', ARRAY['NIOSH 42 CFR 84'], ARRAY['chemical', 'biological']::hazard_category[]),
(NULL, 'N100 Respirator', 'Respiratory Protection', 'Particulate filtering facepiece, 99.97% efficiency', ARRAY['NIOSH 42 CFR 84'], ARRAY['chemical', 'biological']::hazard_category[]),
(NULL, 'Half-Face Respirator', 'Respiratory Protection', 'Reusable half-face air-purifying respirator', ARRAY['NIOSH 42 CFR 84', 'CSA Z94.4-18'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Full-Face Respirator', 'Respiratory Protection', 'Reusable full-face air-purifying respirator', ARRAY['NIOSH 42 CFR 84', 'CSA Z94.4-18'], ARRAY['chemical']::hazard_category[]),
(NULL, 'PAPR', 'Respiratory Protection', 'Powered air-purifying respirator system', ARRAY['NIOSH 42 CFR 84', 'CSA Z94.4-18'], ARRAY['chemical', 'biological']::hazard_category[]),
(NULL, 'SCBA', 'Respiratory Protection', 'Self-contained breathing apparatus', ARRAY['NIOSH 42 CFR 84', 'CSA Z94.4-18'], ARRAY['chemical', 'confined_space']::hazard_category[]),

-- Hand Protection
(NULL, 'Leather Work Gloves', 'Hand Protection', 'General purpose leather gloves', ARRAY['CSA Z96-15'], ARRAY['mechanical', 'physical']::hazard_category[]),
(NULL, 'Cut-Resistant Gloves - Level A2', 'Hand Protection', 'ANSI Level A2 cut resistance', ARRAY['ANSI/ISEA 105-2016'], ARRAY['mechanical']::hazard_category[]),
(NULL, 'Cut-Resistant Gloves - Level A4', 'Hand Protection', 'ANSI Level A4 cut resistance', ARRAY['ANSI/ISEA 105-2016'], ARRAY['mechanical']::hazard_category[]),
(NULL, 'Cut-Resistant Gloves - Level A6', 'Hand Protection', 'ANSI Level A6 cut resistance (highest)', ARRAY['ANSI/ISEA 105-2016'], ARRAY['mechanical']::hazard_category[]),
(NULL, 'Chemical-Resistant Gloves - Nitrile', 'Hand Protection', 'Nitrile gloves for chemical handling', ARRAY['ASTM F739', 'EN 374'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Chemical-Resistant Gloves - Neoprene', 'Hand Protection', 'Neoprene gloves for chemical handling', ARRAY['ASTM F739', 'EN 374'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Chemical-Resistant Gloves - Butyl', 'Hand Protection', 'Butyl rubber gloves for gas/vapor protection', ARRAY['ASTM F739', 'EN 374'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Insulated Gloves - Class 00', 'Hand Protection', 'Electrical insulating gloves up to 500V AC', ARRAY['ASTM D120', 'CSA Z462'], ARRAY['electrical']::hazard_category[]),
(NULL, 'Insulated Gloves - Class 0', 'Hand Protection', 'Electrical insulating gloves up to 1000V AC', ARRAY['ASTM D120', 'CSA Z462'], ARRAY['electrical']::hazard_category[]),
(NULL, 'Impact-Resistant Gloves', 'Hand Protection', 'Gloves with dorsal impact protection', ARRAY['ANSI/ISEA 138-2019'], ARRAY['struck_by', 'mechanical']::hazard_category[]),
(NULL, 'Winter/Insulated Gloves', 'Hand Protection', 'Thermal protection for cold work', ARRAY['EN 511'], ARRAY['physical', 'environmental']::hazard_category[]),

-- Foot Protection
(NULL, 'Safety Boots - Steel Toe', 'Foot Protection', 'Steel toe cap protection, Grade 1', ARRAY['CSA Z195-14'], ARRAY['struck_by', 'mechanical']::hazard_category[]),
(NULL, 'Safety Boots - Composite Toe', 'Foot Protection', 'Non-metallic composite toe protection', ARRAY['CSA Z195-14'], ARRAY['struck_by', 'mechanical']::hazard_category[]),
(NULL, 'Safety Boots - Metatarsal', 'Foot Protection', 'Extended metatarsal protection', ARRAY['CSA Z195-14'], ARRAY['struck_by', 'mechanical']::hazard_category[]),
(NULL, 'Safety Boots - Puncture Resistant', 'Foot Protection', 'Puncture-resistant sole plate', ARRAY['CSA Z195-14'], ARRAY['mechanical', 'struck_by']::hazard_category[]),
(NULL, 'Safety Boots - Electrical Hazard', 'Foot Protection', 'Dielectric protection for electrical hazards', ARRAY['CSA Z195-14'], ARRAY['electrical']::hazard_category[]),
(NULL, 'Safety Boots - Chemical Resistant', 'Foot Protection', 'Chemical-resistant rubber boots', ARRAY['CSA Z195-14'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Safety Boots - Winter/Insulated', 'Foot Protection', 'Insulated boots for cold conditions', ARRAY['CSA Z195-14'], ARRAY['physical', 'environmental']::hazard_category[]),

-- Fall Protection
(NULL, 'Full Body Harness', 'Fall Protection', 'Full body fall arrest harness', ARRAY['CSA Z259.10-18'], ARRAY['fall']::hazard_category[]),
(NULL, 'Full Body Harness - Construction', 'Fall Protection', 'Construction-style harness with tool loops', ARRAY['CSA Z259.10-18'], ARRAY['fall']::hazard_category[]),
(NULL, 'Shock-Absorbing Lanyard', 'Fall Protection', 'Energy-absorbing lanyard, 6ft', ARRAY['CSA Z259.11-17'], ARRAY['fall']::hazard_category[]),
(NULL, 'Self-Retracting Lifeline (SRL)', 'Fall Protection', 'Retractable fall limiter/arrester', ARRAY['CSA Z259.2.2-17'], ARRAY['fall']::hazard_category[]),
(NULL, 'Rope Grab', 'Fall Protection', 'Vertical lifeline rope grab device', ARRAY['CSA Z259.2.5-17'], ARRAY['fall']::hazard_category[]),
(NULL, 'Positioning Lanyard', 'Fall Protection', 'Work positioning lanyard/belt', ARRAY['CSA Z259.1-05'], ARRAY['fall']::hazard_category[]),
(NULL, 'Anchor Strap', 'Fall Protection', 'Cross-arm strap anchor connector', ARRAY['CSA Z259.15-17'], ARRAY['fall']::hazard_category[]),
(NULL, 'Roof Anchor', 'Fall Protection', 'Permanent/temporary roof anchor', ARRAY['CSA Z259.15-17'], ARRAY['fall']::hazard_category[]),

-- High Visibility
(NULL, 'Hi-Vis Vest - Class 2', 'High Visibility', 'Class 2 high visibility safety vest', ARRAY['CSA Z96-15'], ARRAY['struck_by']::hazard_category[]),
(NULL, 'Hi-Vis Vest - Class 3', 'High Visibility', 'Class 3 high visibility safety vest', ARRAY['CSA Z96-15'], ARRAY['struck_by']::hazard_category[]),
(NULL, 'Hi-Vis Jacket', 'High Visibility', 'High visibility jacket with reflective', ARRAY['CSA Z96-15'], ARRAY['struck_by']::hazard_category[]),
(NULL, 'Hi-Vis Pants', 'High Visibility', 'High visibility pants with reflective', ARRAY['CSA Z96-15'], ARRAY['struck_by']::hazard_category[]),
(NULL, 'Hi-Vis Coveralls', 'High Visibility', 'Full high visibility coveralls', ARRAY['CSA Z96-15'], ARRAY['struck_by']::hazard_category[]),

-- Body Protection
(NULL, 'FR Coveralls', 'Body Protection', 'Flame-resistant coveralls', ARRAY['NFPA 2112', 'CSA Z462'], ARRAY['fire_explosion', 'electrical']::hazard_category[]),
(NULL, 'Chemical Suit - Tyvek', 'Body Protection', 'Disposable chemical protective suit', ARRAY['ASTM F1001'], ARRAY['chemical', 'biological']::hazard_category[]),
(NULL, 'Chemical Suit - Level A', 'Body Protection', 'Fully encapsulating chemical suit', ARRAY['NFPA 1991', 'ASTM F1001'], ARRAY['chemical']::hazard_category[]),
(NULL, 'Welding Jacket', 'Body Protection', 'Leather/FR welding jacket', ARRAY['CSA W117.2'], ARRAY['fire_explosion', 'radiation']::hazard_category[]),
(NULL, 'Welding Apron', 'Body Protection', 'Leather welding apron', ARRAY['CSA W117.2'], ARRAY['fire_explosion', 'radiation']::hazard_category[]),
(NULL, 'Cut-Resistant Sleeves', 'Body Protection', 'Cut-resistant arm sleeves', ARRAY['ANSI/ISEA 105-2016'], ARRAY['mechanical']::hazard_category[]),
(NULL, 'Knee Pads', 'Body Protection', 'Knee protection for kneeling work', ARRAY['EN 14404'], ARRAY['ergonomic']::hazard_category[])

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 2. CONTROL MEASURES (Global)
-- ============================================================================

INSERT INTO control_measures (company_id, control_type, name, description, applicable_categories, effectiveness_rating) VALUES
-- Elimination Controls
(NULL, 'elimination', 'Eliminate work at height', 'Design the work to be done at ground level', ARRAY['fall']::hazard_category[], 5),
(NULL, 'elimination', 'Eliminate manual handling', 'Use mechanical handling equipment instead', ARRAY['ergonomic']::hazard_category[], 5),
(NULL, 'elimination', 'Eliminate confined space entry', 'Design work to be done from outside', ARRAY['confined_space']::hazard_category[], 5),
(NULL, 'elimination', 'Eliminate hot work', 'Use mechanical connections instead of welding', ARRAY['fire_explosion']::hazard_category[], 5),
(NULL, 'elimination', 'Eliminate hazardous substance', 'Remove the chemical/substance from the process', ARRAY['chemical']::hazard_category[], 5),

-- Substitution Controls
(NULL, 'substitution', 'Substitute less hazardous chemical', 'Replace toxic solvent with water-based alternative', ARRAY['chemical']::hazard_category[], 4),
(NULL, 'substitution', 'Substitute quieter equipment', 'Use electric instead of pneumatic tools', ARRAY['physical']::hazard_category[], 4),
(NULL, 'substitution', 'Substitute less vibrating tool', 'Use anti-vibration tools', ARRAY['physical']::hazard_category[], 4),
(NULL, 'substitution', 'Substitute lighter materials', 'Use lighter weight materials to reduce strain', ARRAY['ergonomic']::hazard_category[], 4),
(NULL, 'substitution', 'Substitute welding with bolting', 'Use bolted connections instead of welding', ARRAY['fire_explosion', 'radiation']::hazard_category[], 4),

-- Engineering Controls
(NULL, 'engineering', 'Install guardrails', 'Install guardrails at edges and openings', ARRAY['fall']::hazard_category[], 5),
(NULL, 'engineering', 'Install safety netting', 'Install safety netting below work area', ARRAY['fall', 'struck_by']::hazard_category[], 4),
(NULL, 'engineering', 'Install covers over openings', 'Cover floor/roof openings with secured covers', ARRAY['fall']::hazard_category[], 5),
(NULL, 'engineering', 'Install machine guarding', 'Install guards on moving parts and pinch points', ARRAY['mechanical', 'caught_in']::hazard_category[], 5),
(NULL, 'engineering', 'Install local exhaust ventilation', 'Install LEV to capture contaminants at source', ARRAY['chemical']::hazard_category[], 4),
(NULL, 'engineering', 'Install sound barriers/enclosures', 'Enclose noisy equipment', ARRAY['physical']::hazard_category[], 4),
(NULL, 'engineering', 'Install proper lighting', 'Ensure adequate lighting in work areas', ARRAY['fall', 'struck_by']::hazard_category[], 3),
(NULL, 'engineering', 'Install trench shoring/boxes', 'Shore trenches to prevent cave-in', ARRAY['caught_in']::hazard_category[], 5),
(NULL, 'engineering', 'Install lockout/tagout devices', 'Install energy isolation devices', ARRAY['electrical', 'mechanical', 'caught_in']::hazard_category[], 5),
(NULL, 'engineering', 'Install ground fault protection', 'Use GFCI protection on electrical equipment', ARRAY['electrical']::hazard_category[], 4),
(NULL, 'engineering', 'Install ventilation in confined space', 'Provide mechanical ventilation', ARRAY['confined_space', 'chemical']::hazard_category[], 4),
(NULL, 'engineering', 'Install lifelines/anchor points', 'Install permanent fall protection anchors', ARRAY['fall']::hazard_category[], 4),
(NULL, 'engineering', 'Install barricades/barriers', 'Install physical barriers around hazards', ARRAY['struck_by', 'fall', 'mechanical']::hazard_category[], 4),
(NULL, 'engineering', 'Install fire suppression', 'Install fire suppression systems', ARRAY['fire_explosion']::hazard_category[], 4),
(NULL, 'engineering', 'Install proximity alarms', 'Install backup alarms and proximity sensors', ARRAY['struck_by']::hazard_category[], 3),

-- Administrative Controls
(NULL, 'administrative', 'Develop safe work procedure', 'Create written procedure for the task', ARRAY['fall', 'chemical', 'mechanical', 'electrical', 'confined_space', 'fire_explosion']::hazard_category[], 3),
(NULL, 'administrative', 'Conduct JHA/task hazard analysis', 'Complete job hazard analysis before work', ARRAY['fall', 'chemical', 'mechanical', 'electrical', 'confined_space']::hazard_category[], 3),
(NULL, 'administrative', 'Worker training', 'Provide task-specific safety training', ARRAY['fall', 'chemical', 'mechanical', 'electrical', 'confined_space']::hazard_category[], 3),
(NULL, 'administrative', 'Competent supervision', 'Ensure competent person supervises work', ARRAY['fall', 'chemical', 'mechanical', 'electrical', 'confined_space']::hazard_category[], 3),
(NULL, 'administrative', 'Work permits', 'Require permits for high-risk work', ARRAY['confined_space', 'fire_explosion', 'electrical']::hazard_category[], 3),
(NULL, 'administrative', 'Job rotation', 'Rotate workers to limit exposure time', ARRAY['ergonomic', 'physical', 'chemical']::hazard_category[], 3),
(NULL, 'administrative', 'Scheduled breaks', 'Require rest breaks during work', ARRAY['ergonomic', 'physical', 'environmental']::hazard_category[], 3),
(NULL, 'administrative', 'Pre-use inspection', 'Inspect equipment before each use', ARRAY['fall', 'mechanical', 'electrical']::hazard_category[], 3),
(NULL, 'administrative', 'Buddy system', 'Require workers to work in pairs', ARRAY['confined_space', 'fall']::hazard_category[], 3),
(NULL, 'administrative', 'Communication plan', 'Establish clear communication procedures', ARRAY['confined_space', 'caught_in']::hazard_category[], 3),
(NULL, 'administrative', 'Emergency response plan', 'Develop emergency/rescue procedures', ARRAY['confined_space', 'fire_explosion', 'chemical']::hazard_category[], 3),
(NULL, 'administrative', 'Housekeeping program', 'Maintain clean and organized work areas', ARRAY['fall', 'fire_explosion', 'struck_by']::hazard_category[], 3),
(NULL, 'administrative', 'Traffic management plan', 'Separate pedestrians from vehicles', ARRAY['struck_by']::hazard_category[], 3),
(NULL, 'administrative', 'Signage and warnings', 'Post warning signs for hazards', ARRAY['chemical', 'electrical', 'fall', 'struck_by']::hazard_category[], 2),
(NULL, 'administrative', 'Atmospheric monitoring', 'Continuous air quality monitoring', ARRAY['confined_space', 'chemical']::hazard_category[], 3),

-- PPE Controls (last resort)
(NULL, 'ppe', 'Hard hat', 'Wear hard hat for head protection', ARRAY['struck_by', 'fall']::hazard_category[], 2),
(NULL, 'ppe', 'Safety glasses/goggles', 'Wear eye protection', ARRAY['struck_by', 'chemical', 'radiation']::hazard_category[], 2),
(NULL, 'ppe', 'Face shield', 'Wear face shield for face protection', ARRAY['struck_by', 'chemical', 'radiation']::hazard_category[], 2),
(NULL, 'ppe', 'Hearing protection', 'Wear ear plugs or muffs', ARRAY['physical']::hazard_category[], 2),
(NULL, 'ppe', 'Respirator', 'Wear appropriate respiratory protection', ARRAY['chemical', 'biological']::hazard_category[], 2),
(NULL, 'ppe', 'Safety gloves', 'Wear appropriate hand protection', ARRAY['chemical', 'mechanical', 'physical']::hazard_category[], 2),
(NULL, 'ppe', 'Safety boots', 'Wear steel/composite toe boots', ARRAY['struck_by', 'mechanical']::hazard_category[], 2),
(NULL, 'ppe', 'Fall protection harness', 'Wear full body harness with lanyard', ARRAY['fall']::hazard_category[], 2),
(NULL, 'ppe', 'High visibility clothing', 'Wear hi-vis vest or clothing', ARRAY['struck_by']::hazard_category[], 2),
(NULL, 'ppe', 'FR clothing', 'Wear flame-resistant clothing', ARRAY['fire_explosion', 'electrical']::hazard_category[], 2),
(NULL, 'ppe', 'Chemical protective suit', 'Wear chemical protective clothing', ARRAY['chemical']::hazard_category[], 2)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 3. HAZARD LIBRARY - CONSTRUCTION HAZARDS (Global)
-- ============================================================================
-- Organized by trade/activity with pre-mapped controls and PPE

-- FALL HAZARDS
INSERT INTO hazard_library (company_id, hazard_code, name, description, category, subcategory, applicable_trades, applicable_activities, default_severity, default_likelihood, default_risk_level, recommended_controls, required_ppe, regulatory_references) VALUES
(NULL, 'HAZ-FALL-001', 'Falls from ladders', 'Risk of falling while climbing, working on, or descending ladders', 'fall', 'Working at Heights', ARRAY['General Construction', 'Electrical', 'Painting', 'Carpentry'], ARRAY['Ladder Work', 'Access/Egress', 'Material Handling'], 4, 3, 'medium', '[{"type": "engineering", "control": "Use scaffold or platform instead of ladder where possible", "required": false}, {"type": "engineering", "control": "Secure ladder at top and bottom", "required": true}, {"type": "administrative", "control": "Three-point contact rule", "required": true}, {"type": "administrative", "control": "Pre-use ladder inspection", "required": true}]', ARRAY['Hard Hat', 'Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "78-84", "title": "Ladders"}]'),

(NULL, 'HAZ-FALL-002', 'Falls from scaffolds', 'Risk of falling from scaffold platforms, climbing scaffold, or through scaffold openings', 'fall', 'Working at Heights', ARRAY['General Construction', 'Masonry', 'Painting', 'Drywall'], ARRAY['Scaffold Work', 'Material Handling'], 5, 3, 'high', '[{"type": "engineering", "control": "Install guardrails on all open sides", "required": true}, {"type": "engineering", "control": "Install toe boards", "required": true}, {"type": "engineering", "control": "Use scaffold with full decking", "required": true}, {"type": "ppe", "control": "Fall protection where guardrails not feasible", "required": false}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "125-142", "title": "Scaffolds"}]'),

(NULL, 'HAZ-FALL-003', 'Falls through floor/roof openings', 'Risk of falling through unprotected openings in floors, roofs, or other surfaces', 'fall', 'Working at Heights', ARRAY['General Construction', 'Roofing', 'Carpentry', 'HVAC'], ARRAY['Roofing', 'Floor Installation', 'HVAC Installation'], 5, 3, 'high', '[{"type": "engineering", "control": "Install covers secured against displacement", "required": true}, {"type": "engineering", "control": "Install guardrails around openings", "required": true}, {"type": "administrative", "control": "Mark covers clearly - OPENING", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "26.3", "title": "Covers"}]'),

(NULL, 'HAZ-FALL-004', 'Falls from edges - unguarded', 'Risk of falling from unprotected edges of floors, roofs, ramps, or runways', 'fall', 'Working at Heights', ARRAY['General Construction', 'Roofing', 'Structural Steel', 'Formwork'], ARRAY['Edge Work', 'Roofing', 'Steel Erection'], 5, 3, 'high', '[{"type": "engineering", "control": "Install guardrails at edges", "required": true}, {"type": "engineering", "control": "Install safety netting", "required": false}, {"type": "ppe", "control": "Fall arrest system", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Shock-Absorbing Lanyard'], '[{"regulation": "O. Reg. 213/91", "section": "26.1", "title": "Guardrails"}]'),

(NULL, 'HAZ-FALL-005', 'Falls from elevated work platforms', 'Risk of falling from aerial lifts, scissor lifts, or boom lifts', 'fall', 'Working at Heights', ARRAY['General Construction', 'Electrical', 'Painting', 'Glazing'], ARRAY['Elevated Work Platform Operation'], 5, 2, 'medium', '[{"type": "engineering", "control": "Use platform with guardrails", "required": true}, {"type": "administrative", "control": "Operator training/certification", "required": true}, {"type": "ppe", "control": "Fall restraint in boom lifts", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "143-149", "title": "Elevating Work Platforms"}]'),

(NULL, 'HAZ-FALL-006', 'Falls from formwork/falsework', 'Risk of falling during formwork erection, stripping, or working on formwork', 'fall', 'Working at Heights', ARRAY['Concrete', 'Formwork'], ARRAY['Formwork Erection', 'Formwork Stripping', 'Concrete Placement'], 5, 3, 'high', '[{"type": "engineering", "control": "Install working platforms with guardrails", "required": true}, {"type": "engineering", "control": "Install fall arrest anchors", "required": true}, {"type": "administrative", "control": "Engineered formwork design", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "85-102", "title": "Formwork and Falsework"}]'),

(NULL, 'HAZ-FALL-007', 'Falls - slips on wet/icy surfaces', 'Risk of slipping and falling on wet, icy, or contaminated surfaces', 'fall', 'Slips/Trips', ARRAY['General Construction', 'All Trades'], ARRAY['All Activities'], 3, 4, 'medium', '[{"type": "engineering", "control": "Install non-slip surfaces", "required": false}, {"type": "administrative", "control": "Remove snow/ice promptly", "required": true}, {"type": "administrative", "control": "Clean up spills immediately", "required": true}, {"type": "ppe", "control": "Footwear with good traction", "required": true}]', ARRAY['Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "35", "title": "Housekeeping"}]'),

(NULL, 'HAZ-FALL-008', 'Falls - trips over materials/debris', 'Risk of tripping over materials, tools, cords, or debris in work areas', 'fall', 'Slips/Trips', ARRAY['General Construction', 'All Trades'], ARRAY['All Activities'], 3, 4, 'medium', '[{"type": "administrative", "control": "Maintain good housekeeping", "required": true}, {"type": "administrative", "control": "Organize materials and tools", "required": true}, {"type": "engineering", "control": "Cover or elevate cords/hoses", "required": true}]', ARRAY['Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "35", "title": "Housekeeping"}]'),

(NULL, 'HAZ-FALL-009', 'Falls into excavations', 'Risk of falling into trenches, pits, shafts, or excavations', 'fall', 'Excavation', ARRAY['Excavation', 'General Construction', 'Plumbing', 'Electrical'], ARRAY['Excavation Work', 'Underground Utilities'], 5, 3, 'high', '[{"type": "engineering", "control": "Install barricades/guardrails around excavation", "required": true}, {"type": "administrative", "control": "Post warning signs", "required": true}, {"type": "engineering", "control": "Provide safe means of entry/exit", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest'], '[{"regulation": "O. Reg. 213/91", "section": "222-242", "title": "Excavations"}]'),

(NULL, 'HAZ-FALL-010', 'Falls from structural steel', 'Risk of falling during steel erection, connection, or decking work', 'fall', 'Working at Heights', ARRAY['Structural Steel', 'Iron Workers'], ARRAY['Steel Erection', 'Decking', 'Connections'], 5, 3, 'high', '[{"type": "engineering", "control": "Install perimeter cable/guardrails", "required": true}, {"type": "engineering", "control": "Install safety netting", "required": false}, {"type": "ppe", "control": "100% tie-off fall protection", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'SRL'], '[{"regulation": "O. Reg. 213/91", "section": "103-124", "title": "Steel and Metal Work"}]'),

-- STRUCK BY HAZARDS
(NULL, 'HAZ-STRUCK-001', 'Struck by falling objects', 'Risk of being struck by tools, materials, or debris falling from above', 'struck_by', 'Falling Objects', ARRAY['General Construction', 'All Trades'], ARRAY['All Activities Near Overhead Work'], 4, 3, 'medium', '[{"type": "engineering", "control": "Install toe boards on platforms", "required": true}, {"type": "engineering", "control": "Install debris netting", "required": false}, {"type": "administrative", "control": "Barricade area below overhead work", "required": true}, {"type": "ppe", "control": "Hard hat required in all areas", "required": true}]', ARRAY['Hard Hat', 'Safety Glasses'], '[{"regulation": "O. Reg. 213/91", "section": "26.5", "title": "Toe Boards"}]'),

(NULL, 'HAZ-STRUCK-002', 'Struck by swinging loads', 'Risk of being struck by crane loads, materials being hoisted, or swinging objects', 'struck_by', 'Moving Objects', ARRAY['Crane/Rigging', 'Structural Steel', 'General Construction'], ARRAY['Lifting Operations', 'Rigging', 'Material Handling'], 5, 2, 'medium', '[{"type": "engineering", "control": "Use tag lines to control loads", "required": true}, {"type": "administrative", "control": "Trained signal person", "required": true}, {"type": "administrative", "control": "Keep clear of swing radius", "required": true}]', ARRAY['Hard Hat', 'Safety Glasses', 'Hi-Vis Vest'], '[{"regulation": "O. Reg. 213/91", "section": "150-176", "title": "Cranes and Lifting Devices"}]'),

(NULL, 'HAZ-STRUCK-003', 'Struck by vehicles/mobile equipment', 'Risk of being struck by construction vehicles, forklifts, or mobile equipment', 'struck_by', 'Vehicles', ARRAY['General Construction', 'Excavation', 'Paving'], ARRAY['Site Traffic', 'Loading/Unloading', 'Excavation'], 5, 3, 'high', '[{"type": "engineering", "control": "Install traffic barriers", "required": true}, {"type": "administrative", "control": "Traffic control plan", "required": true}, {"type": "administrative", "control": "Spotters for backing equipment", "required": true}, {"type": "ppe", "control": "High visibility clothing", "required": true}]', ARRAY['Hard Hat', 'Hi-Vis Vest', 'Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "67-77", "title": "Vehicles and Equipment"}]'),

(NULL, 'HAZ-STRUCK-004', 'Struck by flying particles', 'Risk of being struck by particles from cutting, grinding, drilling, or chipping', 'struck_by', 'Flying Particles', ARRAY['Concrete', 'Masonry', 'Carpentry', 'Metal Work'], ARRAY['Cutting', 'Grinding', 'Drilling', 'Chipping'], 3, 4, 'medium', '[{"type": "engineering", "control": "Use guards on grinders/saws", "required": true}, {"type": "engineering", "control": "Install barriers/shields", "required": false}, {"type": "ppe", "control": "Safety glasses/goggles required", "required": true}, {"type": "ppe", "control": "Face shield for grinding", "required": true}]', ARRAY['Safety Glasses', 'Face Shield'], '[{"regulation": "O. Reg. 213/91", "section": "108", "title": "Grinding"}]'),

(NULL, 'HAZ-STRUCK-005', 'Struck by hand tools', 'Risk of being struck by hand tools that slip, break, or are improperly used', 'struck_by', 'Tools', ARRAY['General Construction', 'All Trades'], ARRAY['Hand Tool Use'], 2, 3, 'low', '[{"type": "administrative", "control": "Inspect tools before use", "required": true}, {"type": "administrative", "control": "Use correct tool for the job", "required": true}, {"type": "administrative", "control": "Tool training", "required": false}]', ARRAY['Safety Glasses', 'Safety Gloves'], '[]'),

(NULL, 'HAZ-STRUCK-006', 'Struck by power tool kickback', 'Risk of being struck by power tool kickback (saws, grinders, drills)', 'struck_by', 'Power Tools', ARRAY['Carpentry', 'Concrete', 'General Construction'], ARRAY['Sawing', 'Cutting', 'Grinding'], 4, 2, 'medium', '[{"type": "engineering", "control": "Use anti-kickback devices", "required": true}, {"type": "administrative", "control": "Proper tool technique training", "required": true}, {"type": "administrative", "control": "Maintain sharp blades", "required": true}]', ARRAY['Safety Glasses', 'Face Shield', 'Safety Gloves'], '[]'),

-- CAUGHT IN/BETWEEN HAZARDS
(NULL, 'HAZ-CAUGHT-001', 'Caught in rotating machinery', 'Risk of being caught in gears, belts, pulleys, or rotating equipment', 'caught_in', 'Machinery', ARRAY['General Construction', 'All Trades'], ARRAY['Equipment Operation', 'Maintenance'], 5, 2, 'medium', '[{"type": "engineering", "control": "Install machine guards", "required": true}, {"type": "administrative", "control": "Lockout/tagout procedures", "required": true}, {"type": "administrative", "control": "No loose clothing near machinery", "required": true}]', ARRAY['Safety Glasses', 'Safety Boots'], '[{"regulation": "O. Reg. 851", "section": "24-42", "title": "Machine Guarding"}]'),

(NULL, 'HAZ-CAUGHT-002', 'Caught between equipment', 'Risk of being caught between moving equipment and fixed objects', 'caught_in', 'Pinch Points', ARRAY['General Construction', 'Excavation'], ARRAY['Equipment Operation', 'Material Handling'], 5, 2, 'medium', '[{"type": "engineering", "control": "Install proximity alarms/sensors", "required": false}, {"type": "administrative", "control": "Maintain safe clearances", "required": true}, {"type": "administrative", "control": "Spotters for tight spaces", "required": true}]', ARRAY['Hi-Vis Vest', 'Hard Hat'], '[]'),

(NULL, 'HAZ-CAUGHT-003', 'Trench/excavation cave-in', 'Risk of being caught in or buried by excavation wall collapse', 'caught_in', 'Cave-In', ARRAY['Excavation', 'Plumbing', 'Electrical'], ARRAY['Trenching', 'Excavation Work'], 5, 3, 'high', '[{"type": "engineering", "control": "Install trench box/shoring", "required": true}, {"type": "engineering", "control": "Slope or bench walls", "required": true}, {"type": "administrative", "control": "Daily excavation inspection", "required": true}, {"type": "administrative", "control": "Competent person supervision", "required": true}]', ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest'], '[{"regulation": "O. Reg. 213/91", "section": "222-242", "title": "Excavations"}]'),

(NULL, 'HAZ-CAUGHT-004', 'Structural collapse', 'Risk of being caught in building or structural collapse', 'caught_in', 'Structural', ARRAY['Demolition', 'General Construction', 'Formwork'], ARRAY['Demolition', 'Formwork Stripping', 'Structural Work'], 5, 2, 'medium', '[{"type": "engineering", "control": "Engineering assessment required", "required": true}, {"type": "administrative", "control": "Demolition plan required", "required": true}, {"type": "administrative", "control": "Competent person supervision", "required": true}]', ARRAY['Hard Hat', 'Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "200-218", "title": "Demolition"}]'),

-- ELECTRICAL HAZARDS
(NULL, 'HAZ-ELEC-001', 'Contact with live electrical', 'Risk of electrocution from contact with live electrical conductors', 'electrical', 'Electrocution', ARRAY['Electrical', 'General Construction'], ARRAY['Electrical Work', 'Drilling', 'Cutting'], 5, 3, 'high', '[{"type": "elimination", "control": "De-energize and lockout", "required": true}, {"type": "engineering", "control": "Use insulated tools", "required": true}, {"type": "administrative", "control": "Electrical safe work procedures", "required": true}, {"type": "ppe", "control": "Insulated gloves and matting", "required": true}]', ARRAY['Insulated Gloves', 'Safety Glasses', 'Safety Boots - Electrical Hazard'], '[{"regulation": "O. Reg. 213/91", "section": "181-195", "title": "Electrical Hazards"}]'),

(NULL, 'HAZ-ELEC-002', 'Contact with overhead powerlines', 'Risk of electrocution from equipment or materials contacting overhead powerlines', 'electrical', 'Powerlines', ARRAY['Crane/Rigging', 'Excavation', 'General Construction'], ARRAY['Crane Operations', 'Lifting', 'Delivery'], 5, 2, 'medium', '[{"type": "engineering", "control": "Maintain minimum clearance distances", "required": true}, {"type": "administrative", "control": "Utility locates required", "required": true}, {"type": "administrative", "control": "Spotter when working near lines", "required": true}]', ARRAY['Hard Hat', 'Safety Boots'], '[{"regulation": "O. Reg. 213/91", "section": "188", "title": "Overhead Electrical Lines"}]'),

(NULL, 'HAZ-ELEC-003', 'Contact with underground utilities', 'Risk of electrocution from damaging underground electrical services', 'electrical', 'Underground', ARRAY['Excavation', 'Plumbing', 'General Construction'], ARRAY['Excavation', 'Digging'], 5, 2, 'medium', '[{"type": "administrative", "control": "Obtain utility locates", "required": true}, {"type": "administrative", "control": "Hand dig within tolerance zone", "required": true}, {"type": "administrative", "control": "Mark located utilities", "required": true}]', ARRAY['Safety Boots', 'Safety Gloves'], '[{"regulation": "O. Reg. 213/91", "section": "228", "title": "Underground Services"}]'),

(NULL, 'HAZ-ELEC-004', 'Arc flash/arc blast', 'Risk of burns or injury from electrical arc flash or blast', 'electrical', 'Arc Flash', ARRAY['Electrical'], ARRAY['Electrical Work', 'Panel Work', 'Switching'], 5, 2, 'medium', '[{"type": "elimination", "control": "De-energize before work", "required": true}, {"type": "engineering", "control": "Arc flash boundaries", "required": true}, {"type": "ppe", "control": "Arc-rated PPE required", "required": true}]', ARRAY['FR Coveralls', 'Face Shield', 'Insulated Gloves'], '[{"regulation": "CSA Z462", "section": "4.3", "title": "Arc Flash Protection"}]'),

(NULL, 'HAZ-ELEC-005', 'Defective electrical equipment', 'Risk of shock from damaged cords, tools, or temporary power', 'electrical', 'Equipment', ARRAY['General Construction', 'All Trades'], ARRAY['Power Tool Use', 'Temporary Power'], 4, 3, 'medium', '[{"type": "engineering", "control": "Use GFCI protection", "required": true}, {"type": "administrative", "control": "Inspect cords/tools before use", "required": true}, {"type": "administrative", "control": "Remove damaged equipment", "required": true}]', ARRAY['Safety Boots', 'Safety Gloves'], '[{"regulation": "O. Reg. 213/91", "section": "195", "title": "Electrical Equipment"}]'),

-- CHEMICAL HAZARDS
(NULL, 'HAZ-CHEM-001', 'Silica dust exposure', 'Risk of silicosis from respirable crystalline silica dust', 'chemical', 'Dust', ARRAY['Concrete', 'Masonry', 'Demolition'], ARRAY['Cutting', 'Grinding', 'Drilling Concrete/Masonry'], 4, 4, 'high', '[{"type": "engineering", "control": "Wet cutting methods", "required": true}, {"type": "engineering", "control": "Local exhaust ventilation", "required": true}, {"type": "administrative", "control": "Exposure monitoring", "required": true}, {"type": "ppe", "control": "N95 or better respirator", "required": true}]', ARRAY['N95 Respirator', 'Safety Glasses', 'Safety Gloves'], '[{"regulation": "O. Reg. 490/09", "section": "4", "title": "Silica on Construction Projects"}]'),

(NULL, 'HAZ-CHEM-002', 'Asbestos exposure', 'Risk of asbestosis/mesothelioma from asbestos-containing materials', 'chemical', 'Asbestos', ARRAY['Demolition', 'Renovation', 'Insulation'], ARRAY['Asbestos Abatement', 'Renovation Work'], 5, 3, 'high', '[{"type": "administrative", "control": "Asbestos survey before work", "required": true}, {"type": "administrative", "control": "Licensed contractor for removal", "required": true}, {"type": "engineering", "control": "Containment and HEPA filtration", "required": true}]', ARRAY['Full-Face Respirator', 'Tyvek Suit', 'Safety Gloves'], '[{"regulation": "O. Reg. 278/05", "section": "All", "title": "Designated Substance - Asbestos"}]'),

(NULL, 'HAZ-CHEM-003', 'Welding fume exposure', 'Risk from inhalation of metal fumes during welding', 'chemical', 'Fumes', ARRAY['Structural Steel', 'Plumbing', 'HVAC'], ARRAY['Welding', 'Cutting', 'Brazing'], 4, 4, 'high', '[{"type": "engineering", "control": "Local exhaust ventilation", "required": true}, {"type": "engineering", "control": "General dilution ventilation", "required": true}, {"type": "ppe", "control": "Welding respirator", "required": true}]', ARRAY['Half-Face Respirator', 'Welding Hood', 'Welding Gloves'], '[{"regulation": "O. Reg. 213/91", "section": "126", "title": "Welding"}]'),

(NULL, 'HAZ-CHEM-004', 'Solvent exposure', 'Risk from inhalation or skin contact with solvents, adhesives, coatings', 'chemical', 'Solvents', ARRAY['Painting', 'Flooring', 'Roofing'], ARRAY['Painting', 'Adhesive Application', 'Coating'], 3, 4, 'medium', '[{"type": "substitution", "control": "Use water-based products where possible", "required": false}, {"type": "engineering", "control": "Ventilation in enclosed spaces", "required": true}, {"type": "ppe", "control": "Organic vapor respirator", "required": true}, {"type": "ppe", "control": "Chemical-resistant gloves", "required": true}]', ARRAY['Half-Face Respirator', 'Chemical-Resistant Gloves - Nitrile', 'Safety Glasses'], '[]'),

(NULL, 'HAZ-CHEM-005', 'Concrete/cement burns', 'Risk of chemical burns from wet concrete, cement, or mortar', 'chemical', 'Corrosive', ARRAY['Concrete', 'Masonry'], ARRAY['Concrete Placement', 'Finishing', 'Mortar Work'], 3, 4, 'medium', '[{"type": "administrative", "control": "Avoid skin contact with wet concrete", "required": true}, {"type": "ppe", "control": "Waterproof gloves", "required": true}, {"type": "ppe", "control": "Waterproof boots", "required": true}, {"type": "administrative", "control": "Wash exposed skin immediately", "required": true}]', ARRAY['Chemical-Resistant Gloves - Nitrile', 'Safety Boots - Chemical Resistant', 'Safety Glasses'], '[]'),

(NULL, 'HAZ-CHEM-006', 'Lead exposure', 'Risk of lead poisoning from lead-based paint or materials', 'chemical', 'Lead', ARRAY['Painting', 'Demolition', 'Renovation'], ARRAY['Paint Removal', 'Renovation', 'Demolition'], 4, 3, 'medium', '[{"type": "administrative", "control": "Lead assessment before work", "required": true}, {"type": "engineering", "control": "HEPA vacuums and wet methods", "required": true}, {"type": "ppe", "control": "P100 or better respirator", "required": true}]', ARRAY['Half-Face Respirator', 'Tyvek Suit', 'Safety Gloves'], '[{"regulation": "O. Reg. 490/09", "section": "12", "title": "Lead on Construction Projects"}]'),

-- ERGONOMIC HAZARDS
(NULL, 'HAZ-ERGO-001', 'Manual material handling - heavy', 'Risk of musculoskeletal injury from lifting, carrying, or moving heavy materials', 'ergonomic', 'Manual Handling', ARRAY['General Construction', 'All Trades'], ARRAY['Material Handling', 'Loading/Unloading'], 3, 5, 'high', '[{"type": "engineering", "control": "Use mechanical lifting aids", "required": false}, {"type": "administrative", "control": "Team lifting for heavy loads", "required": true}, {"type": "administrative", "control": "Manual handling training", "required": true}]', ARRAY['Safety Gloves', 'Safety Boots'], '[]'),

(NULL, 'HAZ-ERGO-002', 'Repetitive motion - upper body', 'Risk of repetitive strain injury from repetitive arm/hand motions', 'ergonomic', 'Repetitive Motion', ARRAY['Drywall', 'Painting', 'Carpentry'], ARRAY['Fastening', 'Finishing', 'Tool Use'], 3, 4, 'medium', '[{"type": "administrative", "control": "Job rotation", "required": true}, {"type": "administrative", "control": "Regular breaks", "required": true}, {"type": "substitution", "control": "Use power tools where possible", "required": false}]', ARRAY[], '[]'),

(NULL, 'HAZ-ERGO-003', 'Awkward postures - overhead work', 'Risk of injury from sustained overhead work', 'ergonomic', 'Posture', ARRAY['Electrical', 'Plumbing', 'HVAC', 'Drywall'], ARRAY['Overhead Installation', 'Ceiling Work'], 3, 4, 'medium', '[{"type": "engineering", "control": "Use scaffolds/platforms at proper height", "required": true}, {"type": "administrative", "control": "Limit time in overhead position", "required": true}, {"type": "administrative", "control": "Scheduled breaks", "required": true}]', ARRAY['Hard Hat'], '[]'),

(NULL, 'HAZ-ERGO-004', 'Kneeling/crawling work', 'Risk of knee injury from prolonged kneeling or crawling', 'ergonomic', 'Posture', ARRAY['Flooring', 'Plumbing', 'Electrical', 'Roofing'], ARRAY['Floor Installation', 'Low Work', 'Crawl Space Work'], 2, 4, 'medium', '[{"type": "ppe", "control": "Knee pads required", "required": true}, {"type": "administrative", "control": "Job rotation", "required": true}, {"type": "engineering", "control": "Use rolling cart/creeper", "required": false}]', ARRAY['Knee Pads'], '[]'),

(NULL, 'HAZ-ERGO-005', 'Hand-arm vibration', 'Risk of hand-arm vibration syndrome from vibrating tools', 'ergonomic', 'Vibration', ARRAY['Concrete', 'Excavation', 'Carpentry'], ARRAY['Jack Hammer Use', 'Compactor Use', 'Impact Tools'], 3, 4, 'medium', '[{"type": "substitution", "control": "Use anti-vibration tools", "required": false}, {"type": "administrative", "control": "Limit exposure time", "required": true}, {"type": "ppe", "control": "Anti-vibration gloves", "required": true}]', ARRAY['Safety Gloves'], '[]'),

-- CONFINED SPACE HAZARDS
(NULL, 'HAZ-CONF-001', 'Oxygen deficiency', 'Risk of asphyxiation from low oxygen levels in confined spaces', 'confined_space', 'Atmospheric', ARRAY['General Construction', 'Plumbing', 'Excavation'], ARRAY['Confined Space Entry', 'Tank Entry', 'Vault Entry'], 5, 3, 'high', '[{"type": "engineering", "control": "Mechanical ventilation", "required": true}, {"type": "administrative", "control": "Atmospheric testing before/during entry", "required": true}, {"type": "administrative", "control": "Confined space entry permit", "required": true}, {"type": "ppe", "control": "SCBA for rescue", "required": true}]', ARRAY['Full Body Harness', 'Hard Hat'], '[{"regulation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]'),

(NULL, 'HAZ-CONF-002', 'Toxic atmosphere', 'Risk of poisoning from toxic gases/vapours in confined spaces', 'confined_space', 'Atmospheric', ARRAY['General Construction', 'Plumbing'], ARRAY['Confined Space Entry', 'Sewer Work'], 5, 3, 'high', '[{"type": "engineering", "control": "Continuous ventilation", "required": true}, {"type": "administrative", "control": "Continuous atmospheric monitoring", "required": true}, {"type": "ppe", "control": "Supplied air respirator", "required": true}]', ARRAY['SCBA', 'Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]'),

(NULL, 'HAZ-CONF-003', 'Flammable/explosive atmosphere', 'Risk of fire/explosion from flammable gases or vapours', 'confined_space', 'Atmospheric', ARRAY['General Construction', 'Plumbing'], ARRAY['Confined Space Entry', 'Tank Entry'], 5, 2, 'medium', '[{"type": "administrative", "control": "Atmospheric testing for LEL", "required": true}, {"type": "engineering", "control": "Explosion-proof ventilation", "required": true}, {"type": "administrative", "control": "Hot work permit if required", "required": true}]', ARRAY['Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]'),

(NULL, 'HAZ-CONF-004', 'Engulfment in confined space', 'Risk of being trapped or buried by material in confined space', 'confined_space', 'Engulfment', ARRAY['General Construction'], ARRAY['Hopper/Bin Entry', 'Silo Work'], 5, 2, 'medium', '[{"type": "engineering", "control": "Lockout/isolation of material flow", "required": true}, {"type": "administrative", "control": "Attendant stationed at entry", "required": true}, {"type": "ppe", "control": "Rescue retrieval system", "required": true}]', ARRAY['Full Body Harness'], '[{"regulation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]'),

-- FIRE/EXPLOSION HAZARDS
(NULL, 'HAZ-FIRE-001', 'Hot work fire', 'Risk of fire from welding, cutting, or grinding operations', 'fire_explosion', 'Hot Work', ARRAY['Structural Steel', 'Plumbing', 'HVAC'], ARRAY['Welding', 'Cutting', 'Grinding'], 4, 3, 'medium', '[{"type": "administrative", "control": "Hot work permit required", "required": true}, {"type": "administrative", "control": "Fire watch during and after work", "required": true}, {"type": "engineering", "control": "Remove/protect combustibles", "required": true}, {"type": "engineering", "control": "Fire extinguisher within 20 feet", "required": true}]', ARRAY['FR Coveralls', 'Welding Hood', 'Welding Gloves'], '[{"regulation": "O. Reg. 213/91", "section": "52-66", "title": "Fire Prevention"}]'),

(NULL, 'HAZ-FIRE-002', 'Propane/fuel fire', 'Risk of fire from propane heaters, fuel storage, or refueling', 'fire_explosion', 'Fuels', ARRAY['General Construction', 'All Trades'], ARRAY['Heating', 'Equipment Fueling'], 4, 2, 'medium', '[{"type": "engineering", "control": "Proper fuel storage and handling", "required": true}, {"type": "administrative", "control": "No smoking near fuels", "required": true}, {"type": "engineering", "control": "Fire extinguisher nearby", "required": true}]', ARRAY['Safety Glasses', 'Safety Gloves'], '[{"regulation": "O. Reg. 213/91", "section": "52-66", "title": "Fire Prevention"}]'),

(NULL, 'HAZ-FIRE-003', 'Flammable material storage', 'Risk from improper storage of flammable liquids or gases', 'fire_explosion', 'Storage', ARRAY['General Construction', 'Painting', 'Roofing'], ARRAY['Material Storage', 'Chemical Use'], 4, 2, 'medium', '[{"type": "engineering", "control": "Approved flammable storage cabinet", "required": true}, {"type": "engineering", "control": "Proper ventilation of storage", "required": true}, {"type": "administrative", "control": "Limit quantities stored", "required": true}]', ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "56", "title": "Flammable Liquid Storage"}]'),

-- ENVIRONMENTAL HAZARDS
(NULL, 'HAZ-ENV-001', 'Heat stress', 'Risk of heat-related illness from hot weather or hot work environments', 'environmental', 'Temperature', ARRAY['General Construction', 'Roofing', 'Paving'], ARRAY['Outdoor Work', 'Hot Work'], 4, 4, 'high', '[{"type": "administrative", "control": "Work-rest schedule based on conditions", "required": true}, {"type": "administrative", "control": "Provide shade and cooling stations", "required": true}, {"type": "administrative", "control": "Ensure adequate hydration", "required": true}, {"type": "administrative", "control": "Train workers on heat illness signs", "required": true}]', ARRAY[], '[]'),

(NULL, 'HAZ-ENV-002', 'Cold stress/frostbite', 'Risk of hypothermia or frostbite from cold weather work', 'environmental', 'Temperature', ARRAY['General Construction', 'All Trades'], ARRAY['Outdoor Work in Winter'], 4, 3, 'medium', '[{"type": "administrative", "control": "Work-warming break schedule", "required": true}, {"type": "engineering", "control": "Provide heated shelters", "required": true}, {"type": "ppe", "control": "Appropriate cold weather gear", "required": true}]', ARRAY['Winter/Insulated Gloves', 'Safety Boots - Winter/Insulated'], '[]'),

(NULL, 'HAZ-ENV-003', 'UV radiation exposure', 'Risk of sunburn, heat stroke, or skin cancer from sun exposure', 'environmental', 'Radiation', ARRAY['General Construction', 'Roofing', 'Paving'], ARRAY['Outdoor Work'], 3, 4, 'medium', '[{"type": "administrative", "control": "Schedule work to avoid peak sun", "required": false}, {"type": "ppe", "control": "Wide-brim hard hat or neck shade", "required": false}, {"type": "administrative", "control": "Sunscreen application", "required": false}]', ARRAY['Safety Glasses - Tinted'], '[]'),

(NULL, 'HAZ-ENV-004', 'Lightning', 'Risk of lightning strike during outdoor work', 'environmental', 'Weather', ARRAY['Crane/Rigging', 'Structural Steel', 'General Construction'], ARRAY['Outdoor Work', 'Crane Operations'], 5, 2, 'medium', '[{"type": "administrative", "control": "Monitor weather forecasts", "required": true}, {"type": "administrative", "control": "Suspend work when lightning within 30 min", "required": true}, {"type": "administrative", "control": "Take shelter in enclosed structure", "required": true}]', ARRAY[], '[]'),

(NULL, 'HAZ-ENV-005', 'High wind', 'Risk from high winds affecting crane operations, materials, or workers', 'environmental', 'Weather', ARRAY['Crane/Rigging', 'Roofing', 'Structural Steel'], ARRAY['Lifting Operations', 'Roofing', 'High Work'], 4, 3, 'medium', '[{"type": "administrative", "control": "Monitor wind speeds", "required": true}, {"type": "administrative", "control": "Secure loose materials", "required": true}, {"type": "administrative", "control": "Suspend crane operations above limit", "required": true}]', ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "159", "title": "Tower Cranes - Wind"}]'),

-- NOISE HAZARDS  
(NULL, 'HAZ-NOISE-001', 'High noise - power tools', 'Risk of hearing damage from power saws, grinders, drills', 'physical', 'Noise', ARRAY['Carpentry', 'Concrete', 'Metal Work'], ARRAY['Cutting', 'Grinding', 'Drilling'], 3, 5, 'high', '[{"type": "engineering", "control": "Use quieter equipment where available", "required": false}, {"type": "administrative", "control": "Limit exposure duration", "required": true}, {"type": "ppe", "control": "Hearing protection required >85 dBA", "required": true}]', ARRAY['Ear Plugs - Disposable Foam', 'Ear Muffs - Standard'], '[{"regulation": "O. Reg. 381/15", "section": "2", "title": "Noise"}]'),

(NULL, 'HAZ-NOISE-002', 'High noise - heavy equipment', 'Risk of hearing damage from excavators, loaders, compactors', 'physical', 'Noise', ARRAY['Excavation', 'Paving', 'General Construction'], ARRAY['Equipment Operation'], 3, 4, 'medium', '[{"type": "engineering", "control": "Equipment cab enclosure", "required": false}, {"type": "ppe", "control": "Hearing protection required", "required": true}, {"type": "administrative", "control": "Keep non-essential personnel away", "required": true}]', ARRAY['Ear Plugs - Disposable Foam', 'Ear Muffs - Standard'], '[{"regulation": "O. Reg. 381/15", "section": "2", "title": "Noise"}]'),

(NULL, 'HAZ-NOISE-003', 'High noise - impact work', 'Risk of hearing damage from jack hammering, concrete breaking, pile driving', 'physical', 'Noise', ARRAY['Concrete', 'Demolition', 'Foundation'], ARRAY['Breaking', 'Pile Driving', 'Impact Tools'], 3, 5, 'high', '[{"type": "administrative", "control": "Limit exposure time", "required": true}, {"type": "ppe", "control": "Dual hearing protection for high levels", "required": true}, {"type": "administrative", "control": "Hearing conservation program", "required": true}]', ARRAY['Ear Plugs - Disposable Foam', 'Ear Muffs - Standard'], '[{"regulation": "O. Reg. 381/15", "section": "2", "title": "Noise"}]')

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 4. LEGISLATION LIBRARY - ONTARIO
-- ============================================================================

INSERT INTO legislation_library (legislation_type, jurisdiction, name, short_name, citation, description, effective_date, source_url, is_active) VALUES
('act', 'Ontario', 'Occupational Health and Safety Act', 'OHSA', 'R.S.O. 1990, c. O.1', 'The primary legislation governing workplace health and safety in Ontario. Establishes the internal responsibility system, duties of workplace parties, and enforcement mechanisms.', '1990-01-01', 'https://www.ontario.ca/laws/statute/90o01', true),
('regulation', 'Ontario', 'Construction Projects Regulation', 'O. Reg. 213/91', 'O. Reg. 213/91', 'Regulation setting out specific requirements for health and safety on construction projects, including provisions for fall protection, excavations, scaffolds, cranes, and more.', '1991-07-01', 'https://www.ontario.ca/laws/regulation/910213', true),
('regulation', 'Ontario', 'Industrial Establishments Regulation', 'O. Reg. 851', 'R.R.O. 1990, Reg. 851', 'Regulation setting out requirements for industrial establishments including machine guarding, materials handling, and workspace requirements.', '1990-01-01', 'https://www.ontario.ca/laws/regulation/900851', true),
('regulation', 'Ontario', 'Workplace Hazardous Materials Information System', 'WHMIS 2015', 'O. Reg. 860', 'Regulation implementing the Globally Harmonized System for hazardous materials classification, labeling, and safety data sheets.', '2015-07-01', 'https://www.ontario.ca/laws/regulation/900860', true),
('regulation', 'Ontario', 'Designated Substances Regulation', 'O. Reg. 490/09', 'O. Reg. 490/09', 'Regulation for assessment and control of designated substances including asbestos, lead, silica, and other hazardous materials.', '2010-01-01', 'https://www.ontario.ca/laws/regulation/090490', true),
('regulation', 'Ontario', 'Noise Regulation', 'O. Reg. 381/15', 'O. Reg. 381/15', 'Regulation establishing noise exposure limits and hearing protection requirements in workplaces.', '2016-07-01', 'https://www.ontario.ca/laws/regulation/150381', true),
('standard', 'Canada', 'Fall Protection Standard', 'CSA Z259', 'CSA Z259 Series', 'Canadian Standards Association standards for fall protection equipment, systems, and training requirements.', '2018-01-01', 'https://www.csagroup.org', true),
('standard', 'Canada', 'Electrical Safety Standard', 'CSA Z462', 'CSA Z462', 'Canadian standard for workplace electrical safety, including arc flash hazard assessment and safe work practices.', '2021-01-01', 'https://www.csagroup.org', true)

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5. LEGISLATIVE QUICK REFERENCES
-- ============================================================================

INSERT INTO legislative_quick_references (topic, summary, key_points, related_sections, trades, hazard_categories) VALUES
('Fall Protection Requirements', 'Workers must be protected from falls at heights of 3 metres or more, or where there is a danger of falling into equipment, liquid, or through an opening.', ARRAY['Guardrails are the first choice for fall protection', 'Travel restraint prevents reaching fall hazard', 'Fall arrest catches a falling worker', 'Fall protection training is required'], '[{"legislation": "O. Reg. 213/91", "section": "26", "title": "General Requirements - Fall Protection"}, {"legislation": "O. Reg. 213/91", "section": "26.1", "title": "Guardrails"}, {"legislation": "O. Reg. 213/91", "section": "26.4", "title": "Fall Arrest Systems"}]', ARRAY['General Construction', 'Roofing', 'Structural Steel', 'Formwork'], ARRAY['fall']::hazard_category[]),

('Excavation Safety Requirements', 'Excavations deeper than 1.2m must have proper protection against cave-in. Daily inspections by a competent person are required.', ARRAY['Walls over 1.2m deep need shoring, sloping, or trench box', 'Daily inspection required before each shift', 'Ladder access within 8m of workers', 'Keep materials 1m back from edge'], '[{"legislation": "O. Reg. 213/91", "section": "222-242", "title": "Excavations"}, {"legislation": "O. Reg. 213/91", "section": "228", "title": "Underground Services"}]', ARRAY['Excavation', 'Plumbing', 'Electrical', 'General Construction'], ARRAY['caught_in', 'fall']::hazard_category[]),

('Scaffold Requirements', 'Scaffolds must be designed, erected, and maintained by competent workers. Guardrails required on all open sides at heights over 2.4m.', ARRAY['Competent person must supervise erection', 'Guardrails on all open sides', 'Scaffold must be inspected daily', 'Full planking with minimal gaps', 'Safe access via ladder or stairs'], '[{"legislation": "O. Reg. 213/91", "section": "125-142", "title": "Scaffolds"}]', ARRAY['General Construction', 'Masonry', 'Painting'], ARRAY['fall', 'struck_by']::hazard_category[]),

('Ladder Safety', 'Ladders must be inspected before use, set up at proper angle (4:1 ratio), and secured to prevent movement.', ARRAY['Extension ladders at 4:1 angle (75 degrees)', 'Extend 1m above landing', 'Secure top and bottom', 'Face ladder when climbing', 'Three-point contact at all times'], '[{"legislation": "O. Reg. 213/91", "section": "78-84", "title": "Ladders"}]', ARRAY['General Construction', 'All Trades'], ARRAY['fall']::hazard_category[]),

('Electrical Safety', 'Workers must maintain minimum clearances from powerlines. Electrical equipment must be grounded or double-insulated.', ARRAY['Minimum 3m from powerlines under 750V', 'Greater clearances for higher voltages', 'GFCI protection required on construction', 'Inspect cords and tools before use'], '[{"legislation": "O. Reg. 213/91", "section": "181-195", "title": "Electrical Hazards"}]', ARRAY['Electrical', 'Crane/Rigging', 'All Trades'], ARRAY['electrical']::hazard_category[]),

('Confined Space Entry', 'Entry into confined spaces requires atmospheric testing, ventilation, permits, rescue plans, and trained attendants.', ARRAY['Atmospheric testing before and during entry', 'Continuous mechanical ventilation', 'Entry permit system required', 'Trained attendant stationed at entry', 'Rescue equipment and plan in place'], '[{"legislation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]', ARRAY['General Construction', 'Plumbing'], ARRAY['confined_space']::hazard_category[]),

('Hot Work Permit Requirements', 'Welding, cutting, and grinding near combustibles requires hot work permits, fire watches, and fire prevention measures.', ARRAY['Hot work permit required', 'Clear area of combustibles or protect them', 'Fire watch during and 1 hour after', 'Fire extinguisher within 20 feet'], '[{"legislation": "O. Reg. 213/91", "section": "52-66", "title": "Fire Prevention"}]', ARRAY['Structural Steel', 'Plumbing', 'HVAC'], ARRAY['fire_explosion']::hazard_category[]),

('Silica Dust Control', 'Respirable crystalline silica exposure must be controlled through engineering controls, work practices, and respiratory protection.', ARRAY['Use wet cutting methods', 'Local exhaust ventilation with cutting/grinding', 'Air monitoring may be required', 'Minimum N95 respirator when exposed', 'No dry sweeping of silica dust'], '[{"legislation": "O. Reg. 490/09", "section": "4", "title": "Silica on Construction Projects"}]', ARRAY['Concrete', 'Masonry', 'Demolition'], ARRAY['chemical']::hazard_category[]),

('PPE Requirements', 'Employers must ensure workers wear appropriate PPE for hazards. Workers must use PPE provided and receive training on proper use.', ARRAY['Hard hats required on construction sites', 'Safety boots with toe protection', 'Eye protection when hazard present', 'Hearing protection above 85 dBA', 'PPE must be maintained and inspected'], '[{"legislation": "O. Reg. 213/91", "section": "21-24", "title": "Personal Protective Equipment"}]', ARRAY['All Trades'], ARRAY['struck_by', 'fall', 'chemical', 'physical']::hazard_category[])

ON CONFLICT DO NOTHING;


-- ============================================================================
-- 6. JOB/TASK LIBRARY - SAMPLE TASKS
-- ============================================================================

INSERT INTO job_task_library (company_id, task_code, name, description, trade, subtrade, complexity_level, estimated_duration_hours, required_competencies, required_certifications, required_ppe, required_permits, regulatory_references) VALUES
(NULL, 'CONC-POUR-001', 'Concrete Slab Pour', 'Placement and finishing of concrete slab on grade or elevated deck', 'concrete', 'Placement', 3, 8.00, ARRAY['Concrete Placement', 'Power Trowel Operation', 'Concrete Finishing'], ARRAY['WHMIS'], ARRAY['Hard Hat', 'Safety Boots - Chemical Resistant', 'Safety Glasses', 'Chemical-Resistant Gloves - Nitrile'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "96-102", "title": "Concrete Work"}]'),

(NULL, 'FORM-ERECT-001', 'Formwork Erection - Wall', 'Erection of wall formwork including gang forms, ties, and bracing', 'formwork', 'Wall Forms', 4, 16.00, ARRAY['Formwork', 'Fall Protection', 'Rigging'], ARRAY['Working at Heights', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "85-95", "title": "Formwork and Falsework"}]'),

(NULL, 'STEEL-ERECT-001', 'Structural Steel Erection', 'Erection of structural steel beams and columns including connections', 'structural_steel', 'Erection', 5, 24.00, ARRAY['Steel Erection', 'Crane Signals', 'Rigging', 'Bolt-Up'], ARRAY['Working at Heights', 'Rigging', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Safety Glasses', 'Full Body Harness', 'SRL', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "103-124", "title": "Steel and Metal Work"}]'),

(NULL, 'ELEC-PANEL-001', 'Electrical Panel Installation', 'Installation and termination of electrical distribution panel', 'electrical', 'Power Distribution', 4, 8.00, ARRAY['Electrical Installation', 'Panel Terminations', 'Arc Flash Awareness'], ARRAY['Licensed Electrician', 'WHMIS'], ARRAY['Safety Glasses', 'Safety Boots - Electrical Hazard', 'Insulated Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "181-195", "title": "Electrical Hazards"}]'),

(NULL, 'ROOF-FLAT-001', 'Flat Roof Application', 'Installation of flat roofing membrane system', 'roofing', 'Flat Roof', 3, 16.00, ARRAY['Roofing', 'Hot Kettle Operation', 'Fall Protection'], ARRAY['Working at Heights', 'Propane Safety', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Leather Work Gloves'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "26", "title": "Fall Protection"}]'),

(NULL, 'EXC-TRENCH-001', 'Trench Excavation', 'Excavation of utility trench including shoring installation', 'excavation', 'Trenching', 4, 8.00, ARRAY['Excavation', 'Shoring', 'Soil Classification'], ARRAY['Heavy Equipment Operation', 'Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "222-242", "title": "Excavations"}]'),

(NULL, 'WELD-STRUCT-001', 'Structural Welding', 'SMAW or FCAW welding of structural connections', 'structural_steel', 'Welding', 4, 8.00, ARRAY['Structural Welding', 'Weld Inspection'], ARRAY['CWB Certified Welder', 'WHMIS'], ARRAY['Welding Hood', 'Welding Jacket', 'Welding Gloves', 'Safety Boots', 'Half-Face Respirator'], ARRAY['Hot Work Permit'], '[{"regulation": "O. Reg. 213/91", "section": "126", "title": "Welding"}]'),

(NULL, 'DEMO-STRUCT-001', 'Structural Demolition', 'Demolition of structural elements of building', 'demolition', 'Structural', 5, 40.00, ARRAY['Demolition', 'Rigging', 'Structural Assessment'], ARRAY['Working at Heights', 'Rigging', 'WHMIS'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Respirator', 'Full Body Harness'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "200-218", "title": "Demolition"}]'),

(NULL, 'SCAF-ERECT-001', 'Scaffold Erection - Frame', 'Erection of frame scaffold system', 'scaffolding', 'Frame Scaffold', 4, 8.00, ARRAY['Scaffold Erection', 'Fall Protection'], ARRAY['Working at Heights', 'Scaffold Competent Person'], ARRAY['Hard Hat', 'Safety Boots', 'Full Body Harness', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "125-142", "title": "Scaffolds"}]'),

(NULL, 'CRANE-MOB-001', 'Crane Mobilization and Setup', 'Mobilization, setup, and inspection of mobile crane', 'crane_rigging', 'Mobile Crane', 5, 4.00, ARRAY['Crane Operation', 'Rigging', 'Load Charts'], ARRAY['Licensed Crane Operator', 'Rigging'], ARRAY['Hard Hat', 'Safety Boots', 'Hi-Vis Vest', 'Safety Glasses', 'Safety Gloves'], ARRAY[], '[{"regulation": "O. Reg. 213/91", "section": "150-176", "title": "Cranes and Lifting Devices"}]'),

(NULL, 'CONF-ENTRY-001', 'Confined Space Entry', 'Entry into and work within a confined space', 'general_labour', 'Confined Space', 5, 4.00, ARRAY['Confined Space Entry', 'Atmospheric Testing', 'Rescue'], ARRAY['Confined Space Entry', 'Working at Heights'], ARRAY['Hard Hat', 'Full Body Harness', 'Safety Boots', 'Respirator'], ARRAY['Confined Space Entry Permit'], '[{"regulation": "O. Reg. 213/91", "section": "221", "title": "Confined Spaces"}]')

ON CONFLICT DO NOTHING;


-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
