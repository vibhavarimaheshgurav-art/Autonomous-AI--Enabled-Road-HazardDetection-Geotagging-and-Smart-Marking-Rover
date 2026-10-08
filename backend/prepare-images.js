const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'ml-pipeline', 'dataset_final', 'images', 'test');
const destDir = path.join(__dirname, 'uploads');
const hazardsJsonPath = path.join(__dirname, 'data', 'hazards.json');

if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

// Read source files
if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  
  const potholeFiles = files.filter(f => f.startsWith('ds0_')).slice(0, 5);
  const markingFiles = files.filter(f => f.startsWith('ds1_')).slice(0, 5);
  const garbageFiles = files.filter(f => f.startsWith('ds2_Garbage') || f.startsWith('ds2_')).slice(0, 5);

  potholeFiles.forEach((file, idx) => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, `pothole-${idx + 1}.jpg`));
  });

  markingFiles.forEach((file, idx) => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, `faded-marking-${idx + 1}.jpg`));
  });

  garbageFiles.forEach((file, idx) => {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, `garbage-${idx + 1}.jpg`));
  });

  console.log(`Copied ${potholeFiles.length} potholes, ${markingFiles.length} markings, ${garbageFiles.length} garbage images.`);
} else {
  console.log('Source directory not found, using existing uploads');
}

// Update hazards.json with real images
if (fs.existsSync(hazardsJsonPath)) {
  try {
    const hazards = JSON.parse(fs.readFileSync(hazardsJsonPath, 'utf8'));
    hazards.forEach((h, i) => {
      const type = (h.ai_hazard_type || h.trigger_reason || '').toLowerCase();
      const variant = (i % 3) + 1;
      if (type.includes('pothole') || type.includes('cavity')) {
        h.image_url = `http://localhost:5000/uploads/pothole-${variant}.jpg`;
        h.ai_hazard_type = 'pothole';
      } else if (type.includes('garbage') || type.includes('waste') || type.includes('solid')) {
        h.image_url = `http://localhost:5000/uploads/garbage-${variant}.jpg`;
        h.ai_hazard_type = 'garbage';
      } else if (type.includes('marking') || type.includes('line') || type.includes('faded') || type.includes('crosswalk')) {
        h.image_url = `http://localhost:5000/uploads/faded-marking-${variant}.jpg`;
        h.ai_hazard_type = 'faded_marking';
      } else if (type.includes('water')) {
        h.image_url = `http://localhost:5000/uploads/pothole-${variant}.jpg`;
        h.ai_hazard_type = 'waterlogging';
      } else {
        // default distribution
        if (i % 3 === 0) {
          h.image_url = `http://localhost:5000/uploads/pothole-${variant}.jpg`;
          h.ai_hazard_type = 'pothole';
        } else if (i % 3 === 1) {
          h.image_url = `http://localhost:5000/uploads/garbage-${variant}.jpg`;
          h.ai_hazard_type = 'garbage';
        } else {
          h.image_url = `http://localhost:5000/uploads/faded-marking-${variant}.jpg`;
          h.ai_hazard_type = 'faded_marking';
        }
      }
    });
    fs.writeFileSync(hazardsJsonPath, JSON.stringify(hazards, null, 2), 'utf8');
    console.log(`Updated ${hazards.length} hazards with image links.`);
  } catch (e) {
    console.error('Error updating hazards.json:', e);
  }
}
