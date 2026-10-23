# Hospital Navigation & Wayfinding Specification — OPD Saathi

**Canonical Index:** [`PROJECT_BIBLE.md`](file:///d:/HackCached/PROJECT_BIBLE.md)

---

## 1. Navigation Architecture (`shared/navigation/`)

OPD Saathi models **City District Hospital**, a synthetic 3-floor government hospital, using a version-controlled graph in `shared/navigation/hospitalGraph.json` and a pure shortest-path engine in `shared/navigation/pathfinder.js`.

- **No Fake Indoor GPS:** The system never claims live indoor positioning. Routes are computed deterministically from a known origin (e.g., `main_entrance`, `registration_desk`, or user-selected current location) to a verified destination node.
- **Shared Client + Server Execution:** Imported by Express (`GET /api/routes`, `GET /api/slips/:publicCode`) and bundled into the React client so route calculation and **Avoid Stairs** toggling work even if connectivity drops.

---

## 2. Canonical 19-Node Hospital Graph (`Floors 1, 2, 3`)

| Node ID | Floor | Type | Name (English) | Name (Hindi / हिन्दी) | Landmark (EN / HI) |
| :--- | :---: | :--- | :--- | :--- | :--- |
| `main_entrance` | `1` | `entrance` | Main Entrance & Ramp | मुख्य प्रवेश द्वार और रैंप | Near security booth & wheelchair bay / सुरक्षा कक्ष और व्हीलचेयर स्थान के पास |
| `registration_desk` | `1` | `help_desk` | Registration & Help Desk | पंजीकरण और सहायता केंद्र | Blue Counter 1–3, Ground Hall / नीला काउंटर 1–3, भूतल हॉल |
| `emergency_casualty` | `1` | `emergency` | Emergency / Casualty (Room 101) | आपातकालीन / कैजुअल्टी (कमरा 101) | Red sign to the right of Main Entrance / मुख्य प्रवेश द्वार के दाईं ओर लाल बोर्ड |
| `waiting_f1` | `1` | `waiting` | Ground Floor Waiting Area | भूतल प्रतीक्षा क्षेत्र | Opposite Registration Counters / पंजीकरण काउंटर के सामने |
| `pharmacy_f1` | `1` | `facility` | Hospital Pharmacy (Counter 4) | अस्पताल फार्मेसी (काउंटर 4) | Green sign near Drinking Water point / पेयजल केंद्र के पास हरा बोर्ड |
| `lift_main_f1` | `1` | `lift` | Main Patient Lift (Floor 1) | मुख्य रोगी लिफ्ट (तल 1) | Beside Ground Floor Waiting Area / भूतल प्रतीक्षा क्षेत्र के बगल में |
| `stairs_main_f1` | `1` | `stairs` | Central Staircase (Floor 1) | केंद्रीय सीढ़ियाँ (तल 1) | Next to Main Lift lobby / मुख्य लिफ्ट लॉबी के पास |
| `lift_main_f2` | `2` | `lift` | Main Patient Lift (Floor 2) | मुख्य रोगी लिफ्ट (तल 2) | Opens into Floor 2 OPD Waiting Hall / तल 2 ओपीडी प्रतीक्षा हॉल के सामने |
| `stairs_main_f2` | `2` | `stairs` | Central Staircase (Floor 2) | केंद्रीय सीढ़ियाँ (तल 2) | East end of Floor 2 corridor / तल 2 गलियारे के पूर्वी छोर पर |
| `waiting_f2` | `2` | `waiting` | Floor 2 OPD Waiting Hall | तल 2 ओपीडी प्रतीक्षा हॉल | Yellow seating zone outside Lift / लिफ्ट के बाहर पीला बैठने का क्षेत्र |
| `room_204_med` | `2` | `clinic` | Room 204 — General Medicine OPD | कमरा 204 — सामान्य चिकित्सा ओपीडी | Left corridor from Floor 2 Lift / तल 2 लिफ्ट से बाएँ गलियारे में |
| `room_208_ped` | `2` | `clinic` | Room 208 — Paediatrics OPD | कमरा 208 — बाल रोग ओपीडी | Child mural wall, Floor 2 West / बच्चों के चित्र वाली दीवार, तल 2 पश्चिम |
| `lab_f2` | `2` | `diagnostic` | Room 212 — Central Pathology Lab | कमरा 212 — केंद्रीय पैथोलॉजी लैब | Sample collection window, Floor 2 / नमूना संग्रह खिड़की, तल 2 |
| `xray_f2` | `2` | `diagnostic` | Room 215 — Digital X-Ray & Imaging | कमरा 215 — डिजिटल एक्स-रे कक्ष | Amber caution light, end of Floor 2 / पीली चेतावनी लाइट, तल 2 का अंत |
| `lift_main_f3` | `3` | `lift` | Main Patient Lift (Floor 3) | मुख्य रोगी लिफ्ट (तल 3) | Opens into Floor 3 Specialty Hall / तल 3 स्पेशलिटी हॉल के सामने |
| `stairs_main_f3` | `3` | `stairs` | Central Staircase (Floor 3) | केंद्रीय सीढ़ियाँ (तल 3) | East end of Floor 3 corridor / तल 3 गलियारे के पूर्वी छोर पर |
| `waiting_f3` | `3` | `waiting` | Floor 3 Specialty Waiting Area | तल 3 स्पेशलिटी प्रतीक्षा क्षेत्र | Outside Room 302–305 / कमरा 302–305 के बाहर |
| `room_302_ort` | `3` | `clinic` | Room 302 — Orthopaedics & Joint Care | कमरा 302 — हड्डी एवं जोड़ रोग ओपीडी | Immediately left of Floor 3 Lift / तल 3 लिफ्ट के ठीक बाईं ओर |
| `room_305_eye` | `3` | `clinic` | Room 305 — Ophthalmology (Eye OPD) | कमरा 305 — नेत्र रोग ओपीडी | Eye chart signboard, Floor 3 Right / नेत्र चार्ट बोर्ड, तल 3 दाईं ओर |

---

## 3. Bidirectional Edge Normalisation & Avoid Stairs Algorithm

1. **Bidirectional Edge Expansion:**
   - Each edge in `hospitalGraph.json` defines `{ from, to, distanceMeters, durationSeconds, mode: 'corridor'|'lift'|'stairs'|'ramp', accessible: boolean, direction_en, direction_hi, reverse_direction_en, reverse_direction_hi }`.
   - At load time, `pathfinder.js` automatically registers both `from -> to` and `to -> from` (unless `oneWay: true`), guaranteeing that reverse routes (e.g., `room_302_ort -> registration_desk` or `room_204_med -> pharmacy_f1`) always succeed.
2. **Avoid Stairs Filter (`avoidStairs = true` by default):**
   - Before running Dijkstra's shortest-path algorithm, if `avoidStairs === true`, all edges where `mode === 'stairs'` or `accessible === false` are filtered out.
   - Multi-floor transitions with `avoidStairs = true` traverse `lift_main_f1 <-> lift_main_f2 <-> lift_main_f3` and emit explicit floor-change step cards (e.g., *"Take Main Patient Lift from Floor 1 to Floor 2"*).
3. **Graceful Unreachable Fallback:**
   - If an unknown node ID is requested or no path exists under the selected filter, the pathfinder returns `{ found: false, reason: 'NO_ACCESSIBLE_ROUTE' | 'NODE_NOT_FOUND' }` and the UI instructs the patient to ask the Registration / Help Desk rather than inventing a route.

---

## 4. Mandatory 10-Route Verification Matrix

Automated unit tests verify all 10 origin/destination pairs with `avoidStairs: true` and `avoidStairs: false`:
1. `main_entrance` $\rightarrow$ `registration_desk`
2. `registration_desk` $\rightarrow$ `waiting_f1`
3. `registration_desk` $\rightarrow$ `room_204_med` (Floor 1 $\rightarrow$ Floor 2 via Lift when `avoidStairs: true`)
4. `main_entrance` $\rightarrow$ `pharmacy_f1`
5. `waiting_f1` $\rightarrow$ `lab_f2` (Floor 1 $\rightarrow$ Floor 2)
6. `lab_f2` $\rightarrow$ `xray_f2` (Same-floor diagnostic transition)
7. `room_204_med` $\rightarrow$ `pharmacy_f1` (Floor 2 $\rightarrow$ Floor 1 downward return via Lift)
8. `main_entrance` $\rightarrow$ `emergency_casualty` (Immediate Ground Floor emergency route)
9. `room_302_ort` $\rightarrow$ `registration_desk` (Floor 3 $\rightarrow$ Floor 1 downward return)
10. `main_entrance` $\rightarrow$ `disconnected_maintenance_room` (Intentional unreachable/unknown node graceful failure test)
