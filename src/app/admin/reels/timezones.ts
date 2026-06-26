// ISO2 (lowercase) → primary IANA timezone identifier.
// For countries with multiple timezones, uses the most populated zone.
// Used to calculate GMT post time from local time + country.
export const COUNTRY_TZ: Record<string, string> = {
  af: 'Asia/Kabul',           al: 'Europe/Tirane',         dz: 'Africa/Algiers',
  ad: 'Europe/Andorra',       ao: 'Africa/Luanda',          ag: 'America/Antigua',
  ar: 'America/Argentina/Buenos_Aires', am: 'Asia/Yerevan', au: 'Australia/Sydney',
  at: 'Europe/Vienna',        az: 'Asia/Baku',              bs: 'America/Nassau',
  bh: 'Asia/Bahrain',         bd: 'Asia/Dhaka',             bb: 'America/Barbados',
  by: 'Europe/Minsk',         be: 'Europe/Brussels',        bz: 'America/Belize',
  bj: 'Africa/Porto-Novo',    bt: 'Asia/Thimphu',           bo: 'America/La_Paz',
  ba: 'Europe/Sarajevo',      bw: 'Africa/Gaborone',        br: 'America/Sao_Paulo',
  bn: 'Asia/Brunei',          bg: 'Europe/Sofia',           bf: 'Africa/Ouagadougou',
  bi: 'Africa/Bujumbura',     cv: 'Atlantic/Cape_Verde',    kh: 'Asia/Phnom_Penh',
  cm: 'Africa/Douala',        ca: 'America/Toronto',        cf: 'Africa/Bangui',
  td: 'Africa/Ndjamena',      cl: 'America/Santiago',       cn: 'Asia/Shanghai',
  co: 'America/Bogota',       km: 'Indian/Comoro',          cd: 'Africa/Kinshasa',
  cg: 'Africa/Brazzaville',   cr: 'America/Costa_Rica',     hr: 'Europe/Zagreb',
  cu: 'America/Havana',       cy: 'Asia/Nicosia',           cz: 'Europe/Prague',
  dk: 'Europe/Copenhagen',    dj: 'Africa/Djibouti',        dm: 'America/Dominica',
  do: 'America/Santo_Domingo',ec: 'America/Guayaquil',      eg: 'Africa/Cairo',
  sv: 'America/El_Salvador',  gq: 'Africa/Malabo',          er: 'Africa/Asmara',
  ee: 'Europe/Tallinn',       sz: 'Africa/Mbabane',         et: 'Africa/Addis_Ababa',
  fj: 'Pacific/Fiji',         fi: 'Europe/Helsinki',        fr: 'Europe/Paris',
  ga: 'Africa/Libreville',    gm: 'Africa/Banjul',          ge: 'Asia/Tbilisi',
  de: 'Europe/Berlin',        gh: 'Africa/Accra',            gr: 'Europe/Athens',
  gd: 'America/Grenada',      gt: 'America/Guatemala',      gn: 'Africa/Conakry',
  gw: 'Africa/Bissau',        gy: 'America/Guyana',         ht: 'America/Port-au-Prince',
  hn: 'America/Tegucigalpa',  hu: 'Europe/Budapest',        is: 'Atlantic/Reykjavik',
  in: 'Asia/Kolkata',         id: 'Asia/Jakarta',            ir: 'Asia/Tehran',
  iq: 'Asia/Baghdad',         ie: 'Europe/Dublin',           il: 'Asia/Jerusalem',
  it: 'Europe/Rome',          jm: 'America/Jamaica',         jp: 'Asia/Tokyo',
  jo: 'Asia/Amman',           kz: 'Asia/Almaty',             ke: 'Africa/Nairobi',
  ki: 'Pacific/Tarawa',       kw: 'Asia/Kuwait',             kg: 'Asia/Bishkek',
  la: 'Asia/Vientiane',       lv: 'Europe/Riga',             lb: 'Asia/Beirut',
  ls: 'Africa/Maseru',        lr: 'Africa/Monrovia',         ly: 'Africa/Tripoli',
  li: 'Europe/Vaduz',         lt: 'Europe/Vilnius',          lu: 'Europe/Luxembourg',
  mg: 'Indian/Antananarivo',  mw: 'Africa/Blantyre',         my: 'Asia/Kuala_Lumpur',
  mv: 'Indian/Maldives',      ml: 'Africa/Bamako',           mt: 'Europe/Malta',
  mh: 'Pacific/Majuro',       mr: 'Africa/Nouakchott',       mu: 'Indian/Mauritius',
  mx: 'America/Mexico_City',  fm: 'Pacific/Pohnpei',         md: 'Europe/Chisinau',
  mc: 'Europe/Monaco',        mn: 'Asia/Ulaanbaatar',        me: 'Europe/Podgorica',
  ma: 'Africa/Casablanca',    mz: 'Africa/Maputo',           mm: 'Asia/Rangoon',
  na: 'Africa/Windhoek',      nr: 'Pacific/Nauru',           np: 'Asia/Kathmandu',
  nl: 'Europe/Amsterdam',     nz: 'Pacific/Auckland',        ni: 'America/Managua',
  ne: 'Africa/Niamey',        ng: 'Africa/Lagos',            mk: 'Europe/Skopje',
  no: 'Europe/Oslo',          om: 'Asia/Muscat',             pk: 'Asia/Karachi',
  pw: 'Pacific/Palau',        pa: 'America/Panama',          pg: 'Pacific/Port_Moresby',
  py: 'America/Asuncion',     pe: 'America/Lima',            ph: 'Asia/Manila',
  pl: 'Europe/Warsaw',        pt: 'Europe/Lisbon',           qa: 'Asia/Qatar',
  ro: 'Europe/Bucharest',     ru: 'Europe/Moscow',           rw: 'Africa/Kigali',
  kn: 'America/St_Kitts',     lc: 'America/St_Lucia',        vc: 'America/St_Vincent',
  ws: 'Pacific/Apia',         sm: 'Europe/San_Marino',       st: 'Africa/Sao_Tome',
  sa: 'Asia/Riyadh',          sn: 'Africa/Dakar',            rs: 'Europe/Belgrade',
  sc: 'Indian/Mahe',          sl: 'Africa/Freetown',         sg: 'Asia/Singapore',
  sk: 'Europe/Bratislava',    si: 'Europe/Ljubljana',        sb: 'Pacific/Guadalcanal',
  so: 'Africa/Mogadishu',     za: 'Africa/Johannesburg',     ss: 'Africa/Juba',
  es: 'Europe/Madrid',        lk: 'Asia/Colombo',            sd: 'Africa/Khartoum',
  sr: 'America/Paramaribo',   se: 'Europe/Stockholm',        ch: 'Europe/Zurich',
  sy: 'Asia/Damascus',        tw: 'Asia/Taipei',             tj: 'Asia/Dushanbe',
  tz: 'Africa/Dar_es_Salaam', th: 'Asia/Bangkok',            tl: 'Asia/Dili',
  tg: 'Africa/Lome',          to: 'Pacific/Tongatapu',       tt: 'America/Port_of_Spain',
  tn: 'Africa/Tunis',         tr: 'Europe/Istanbul',         tm: 'Asia/Ashgabat',
  tv: 'Pacific/Funafuti',     ug: 'Africa/Kampala',          ua: 'Europe/Kiev',
  ae: 'Asia/Dubai',           gb: 'Europe/London',           us: 'America/New_York',
  uy: 'America/Montevideo',   uz: 'Asia/Tashkent',           vu: 'Pacific/Efate',
  ve: 'America/Caracas',      vn: 'Asia/Ho_Chi_Minh',        ye: 'Asia/Aden',
  zm: 'Africa/Lusaka',        zw: 'Africa/Harare',
}

// Convert a local date+time in a given timezone to a UTC HH:MM string.
// Uses the Intl API so BST, DST, etc. are handled automatically.
export function localToGmt(date: string, time: string, ianaTimezone: string): string | null {
  if (!date || !time || !ianaTimezone) return null
  try {
    // Treat the input as fake UTC to get a concrete Date object
    const approxUtc = new Date(`${date}T${time}:00Z`)

    // Find what local date/time this UTC moment represents in the target zone
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: ianaTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    const parts = fmt.formatToParts(approxUtc)
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
    const localEquiv = new Date(
      `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:00Z`
    )

    // Offset = approxUtc - localEquiv (what fake-UTC read as local)
    const offsetMs = approxUtc.getTime() - localEquiv.getTime()

    // True UTC = user's local input + offset
    const trueUtc = new Date(approxUtc.getTime() + offsetMs)
    return trueUtc.toISOString().slice(11, 16) // "HH:MM"
  } catch {
    return null
  }
}
