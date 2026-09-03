import fs from 'fs';
import path from 'path';

const dir = './src/hackathons';
const files = [
  'text_input/TextInput.tsx',
  'currency/Currency.tsx',
  'frogger/Frogger.tsx',
  'gameClones/GameClones.tsx',
  'volumeInput/VolumeInput.tsx',
  'simpleCompetition/SimpleCompetition.tsx'
];

for (const file of files) {
  const p = path.join(dir, file);
  let content = fs.readFileSync(p, 'utf8');
  
  content = content.replace(
    /import \{ CompetitionToggle, type Competitor \} from "@\/components\/CompetitionToggle";/,
    'import { CompetitionToggle, type Competitor, useCompetitionState } from "@/components/CompetitionToggle";'
  );
  
  content = content.replace(
    /const \[activeCompetitorId, setActiveCompetitorId\] = useState<string>\("val"\);\s+const \[activeIterationId, setActiveIterationId\] = useState<string>\("v1"\);\s+const handleToggleChange = \(competitorId: string, iterationId: string\) => \{\s+setActiveCompetitorId\(competitorId\);\s+setActiveIterationId\(iterationId\);\s+\};/,
    'const { activeCompetitorId, activeIterationId, handleToggleChange } = useCompetitionState("val", "v1");'
  );

  // If useState is completely unused now
  if (!content.match(/useState\(/)) {
     content = content.replace(/import \{ useState \} from "react";\n?/, '');
  }
  
  fs.writeFileSync(p, content);
}
console.log('done');
