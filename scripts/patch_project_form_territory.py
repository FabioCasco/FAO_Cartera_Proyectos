from pathlib import Path
import re

path = Path("geoportal-mvp/components/project-form.jsx")
text = path.read_text()

old_import = (
    'import { createProjectBundle, getAreas, uploadProjectAssets } from "@/lib/data";\n'
    'import { LocationPicker } from "./location-picker";'
)
new_import = (
    'import { createProjectBundle, getAreas, uploadProjectAssets } from "@/lib/data";\n'
    'import { TerritoryEditor, createEmptyLocation } from "./territory-editor";'
)
if old_import not in text:
    raise SystemExit("Project form import pattern not found")
text = text.replace(old_import, new_import, 1)

empty_location_pattern = re.compile(
    r'const emptyLocation = \(\) => \(\{ geometry_type: "point", department: "", municipality: "", location_name: "", latitude: 14\.0723, longitude: -87\.2068, intervention_type: "", notes: "" \}\);\n'
)
text, count = empty_location_pattern.subn("", text, count=1)
if count != 1:
    raise SystemExit("Empty location factory pattern not found")

if "useState([emptyLocation()])" not in text:
    raise SystemExit("Initial location state pattern not found")
text = text.replace(
    "useState([emptyLocation()])",
    "useState([createEmptyLocation()])",
    1,
)

old_locations = (
    "locations: locations.filter((l) => l.municipality || "
    "(l.latitude && l.longitude)).map((l) => ({ ...l, latitude: "
    "Number(l.latitude), longitude: Number(l.longitude) }))"
)
new_locations = '''locations: locations
            .filter((location) =>
              location.department ||
              location.municipality ||
              (location.latitude !== null && location.longitude !== null),
            )
            .map((location) => ({
              ...location,
              latitude:
                location.latitude === null || location.latitude === ""
                  ? null
                  : Number(location.latitude),
              longitude:
                location.longitude === null || location.longitude === ""
                  ? null
                  : Number(location.longitude),
            }))'''
if old_locations not in text:
    raise SystemExit("Location payload mapping pattern not found")
text = text.replace(old_locations, new_locations, 1)

start = text.find('    {step === 3 && <div className="form-section">')
end = text.find('    {step === 4 && <div className="form-section">', start)
if start < 0 or end < 0:
    raise SystemExit("Territory step boundaries not found")

new_step = '''    {step === 3 && <div className="form-section"><div className="section-title"><span>04</span><div><h2>Territorio y alcance espacial</h2><p>Combine coberturas departamentales, municipales y puntos específicos. El Geoportal transformará estos registros en capas de presencia y convergencia.</p></div></div><TerritoryEditor locations={locations} setLocations={setLocations}/></div>}
'''
text = text[:start] + new_step + text[end:]

path.write_text(text)
print("Project territory intake patched successfully.")
