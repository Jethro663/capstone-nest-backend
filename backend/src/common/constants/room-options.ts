export const ALLOWED_ROOM_NUMBERS = [
  '101',
  '102',
  '103',
  '104',
  '105',
  '201',
  '202',
  '203',
  '204',
  '205',
  '301',
  '302',
  '303',
  '304',
  '305',
  '401',
  '402',
  '403',
  '404',
  '405',
] as const;

export const ALLOWED_ROOM_NUMBERS_SET = new Set<string>(ALLOWED_ROOM_NUMBERS);

export const ALLOWED_ROOM_NUMBERS_MESSAGE =
  'Room must be one of: 101-105, 201-205, 301-305, 401-405';
