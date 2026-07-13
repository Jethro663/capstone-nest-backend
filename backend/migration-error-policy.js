function isHarmlessMigrationError(err) {
  const harmless = [
    '42710', // duplicate_object (type/constraint already exists)
    '42P07', // duplicate_table
    '42701', // duplicate_column
    '42P01', // undefined_table (constraint/index already dropped)
    '42703', // undefined_column
  ];
  return harmless.includes(err.code);
}

module.exports = { isHarmlessMigrationError };
