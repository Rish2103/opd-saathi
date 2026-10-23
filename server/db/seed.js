import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withTransaction, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);

/**
 * Canonical synthetic departments for City District Hospital (3 Floors).
 * Node IDs correspond to shared/navigation/hospitalGraph.json.
 */
export const SEED_DEPARTMENTS = [
  {
    slug: 'general-medicine',
    token_prefix: 'GEN',
    name_en: 'General Medicine OPD',
    name_hi: 'सामान्य चिकित्सा ओपीडी (General Medicine)',
    doctor_name_en: 'Dr. Rajesh Sharma',
    doctor_name_hi: 'डॉ. राजेश शर्मा',
    room_label: 'Room 204',
    floor_number: 2,
    destination_node_id: 'room_204_med',
    landmark_en: 'Left corridor from Floor 2 Main Lift',
    landmark_hi: 'तल 2 की मुख्य लिफ्ट से बाएँ गलियारे में',
    average_consult_minutes: 8,
  },
  {
    slug: 'paediatrics',
    token_prefix: 'PED',
    name_en: 'Paediatrics (Child Health) OPD',
    name_hi: 'बाल रोग ओपीडी (Paediatrics)',
    doctor_name_en: 'Dr. Anita Verma',
    doctor_name_hi: 'डॉ. अनिता वर्मा',
    room_label: 'Room 208',
    floor_number: 2,
    destination_node_id: 'room_208_ped',
    landmark_en: 'Near Child Mural Wall, Floor 2 West Wing',
    landmark_hi: 'बच्चों के चित्र वाली दीवार के पास, तल 2 पश्चिम',
    average_consult_minutes: 10,
  },
  {
    slug: 'orthopaedics',
    token_prefix: 'ORT',
    name_en: 'Orthopaedics & Joint Care OPD',
    name_hi: 'हड्डी एवं जोड़ रोग ओपीडी (Orthopaedics)',
    doctor_name_en: 'Dr. Vikram Nair',
    doctor_name_hi: 'डॉ. विक्रम नायर',
    room_label: 'Room 302',
    floor_number: 3,
    destination_node_id: 'room_302_ort',
    landmark_en: 'Immediately left of Floor 3 Main Lift',
    landmark_hi: 'तल 3 की मुख्य लिफ्ट के ठीक बाईं ओर',
    average_consult_minutes: 12,
  },
  {
    slug: 'ophthalmology',
    token_prefix: 'EYE',
    name_en: 'Ophthalmology (Eye Care) OPD',
    name_hi: 'नेत्र रोग ओपीडी (Eye Care)',
    doctor_name_en: 'Dr. Meera Iyer',
    doctor_name_hi: 'डॉ. मीरा अय्यर',
    room_label: 'Room 305',
    floor_number: 3,
    destination_node_id: 'room_305_eye',
    landmark_en: 'Opposite Eye Chart Signboard, Floor 3 Right Wing',
    landmark_hi: 'नेत्र चार्ट बोर्ड के सामने, तल 3 दाईं ओर',
    average_consult_minutes: 10,
  },
];

export async function runSeed() {
  await withTransaction(async (client) => {
    for (const dept of SEED_DEPARTMENTS) {
      const upsertDept = await client.query(
        `
        INSERT INTO departments (
          slug, token_prefix, name_en, name_hi,
          doctor_name_en, doctor_name_hi, room_label, floor_number,
          destination_node_id, landmark_en, landmark_hi, average_consult_minutes, is_active
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
        ON CONFLICT (slug) DO UPDATE SET
          token_prefix = EXCLUDED.token_prefix,
          name_en = EXCLUDED.name_en,
          name_hi = EXCLUDED.name_hi,
          doctor_name_en = EXCLUDED.doctor_name_en,
          doctor_name_hi = EXCLUDED.doctor_name_hi,
          room_label = EXCLUDED.room_label,
          floor_number = EXCLUDED.floor_number,
          destination_node_id = EXCLUDED.destination_node_id,
          landmark_en = EXCLUDED.landmark_en,
          landmark_hi = EXCLUDED.landmark_hi,
          average_consult_minutes = EXCLUDED.average_consult_minutes,
          is_active = true
        RETURNING id;
        `,
        [
          dept.slug,
          dept.token_prefix,
          dept.name_en,
          dept.name_hi,
          dept.doctor_name_en,
          dept.doctor_name_hi,
          dept.room_label,
          dept.floor_number,
          dept.destination_node_id,
          dept.landmark_en,
          dept.landmark_hi,
          dept.average_consult_minutes,
        ]
      );

      const departmentId = upsertDept.rows[0].id;

      await client.query(
        `
        INSERT INTO doctor_status (department_id, status, delay_minutes)
        VALUES ($1, 'AVAILABLE', 0)
        ON CONFLICT (department_id) DO NOTHING;
        `,
        [departmentId]
      );
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runSeed()
    .then(async () => {
      console.log(
        `[db:seed] Seeded ${SEED_DEPARTMENTS.length} departments and doctor_status records idempotently.`
      );
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[db:seed] Failed to seed database:', err.message);
      await closePool();
      process.exit(1);
    });
}
