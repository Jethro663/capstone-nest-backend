// Disposable local fixtures only. Never run against a real school database.
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('node:crypto');
const url = process.env.ACADEMIC_TEST_DATABASE_URL;
if (!url) throw new Error('Provide ACADEMIC_TEST_DATABASE_URL');
const parsed = new URL(url);
if (!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname) || !parsed.pathname.startsWith('/nexora_academic_test_')) throw new Error('Only disposable local Nexora academic test databases are permitted');
(async () => {
  const db = new Client({ connectionString: url }); await db.connect();
  try {
    if (Number((await db.query('select count(*) as count from users')).rows[0].count)) throw new Error('Browser fixture requires an empty database');
    await db.query('BEGIN');
    const password = 'NexoraAcademicTest!2026';
    const hash = await bcrypt.hash(password, 10); const ids = {};
    for (const role of ['admin','teacher','student']) {
      const roleId = randomUUID(); ids[role] = randomUUID();
      await db.query('insert into roles(id,name) values($1,$2)', [roleId,role]);
      await db.query('insert into users(id,email,password,first_name,last_name,is_email_verified) values($1,$2,$3,$4,$5,true)', [ids[role],`academic-${role}@example.invalid`,hash,role === 'student' ? 'Ana' : role === 'teacher' ? 'Tessa' : 'Alex','Fixture']);
      await db.query('insert into user_roles(user_id,role_id,assigned_by) values($1,$2,$3)',[ids[role],roleId,'LOCAL_TEST']);
    }
    await db.query("insert into student_profiles(user_id,grade_level,lrn) values($1,'8','000000260001')",[ids.student]);
    await db.query("insert into teacher_profiles(user_id,department,specialization) values($1,'Mathematics','Math')",[ids.teacher]);
    ids.section=randomUUID();ids.class=randomUUID();
    await db.query("insert into sections(id,name,grade_level,school_year,room_number,adviser_id) values($1,'Academic Fixture','8','2026-2027','101',$2)",[ids.section,ids.teacher]);
    await db.query("insert into classes(id,subject_name,subject_code,subject_grade_level,section_id,teacher_id,school_year,room) values($1,'Mathematics 8','MATH-8','8',$2,$3,'2026-2027','101')",[ids.class,ids.section,ids.teacher]);
    await db.query("insert into enrollments(student_id,class_id,section_id) values($1,$2,$3)",[ids.student,ids.class,ids.section]);
    await db.query("insert into academic_system_states(id,school_year,quarter,version,updated_by) values('00000000-0000-0000-0000-000000000001','2026-2027','Q1',1,$1)",[ids.admin]);
    await db.query('COMMIT'); console.log(JSON.stringify({ ...ids, password, schoolYear:'2026-2027' },null,2));
  } catch(error) { await db.query('ROLLBACK');throw error; } finally { await db.end(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
