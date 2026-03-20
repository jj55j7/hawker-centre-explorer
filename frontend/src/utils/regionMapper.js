const SECTOR_REGION = {
  '01':'Central','02':'Central','03':'Central','04':'Central',
  '07':'Central','08':'Central',
  '14':'Central','15':'Central','16':'Central',
  '17':'Central','18':'Central','19':'Central',
  '20':'Central','21':'Central',
  '55':'North','56':'North','57':'North',
  '69':'North','70':'North','71':'North','72':'North','73':'North',
  '28':'North-East',
  '37':'North-East','38':'North-East','39':'North-East',
  '40':'North-East','41':'North-East',
  '53':'North-East','54':'North-East',
  '34':'East','35':'East','36':'East',
  '42':'East','43':'East','44':'East','45':'East',
  '46':'East','47':'East','48':'East',
  '49':'East','50':'East','51':'East','52':'East',
  '05':'West','06':'West',
  '22':'West','23':'West',
  '24':'West','25':'West','26':'West','27':'West',
  '60':'West','61':'West','62':'West','63':'West',
  '64':'West','65':'West','66':'West','67':'West','68':'West',
}

export const REGIONS = ['All', 'Central', 'North', 'North-East', 'East', 'West']

export const REGION_COLORS = {
  'Central':    '#C0392B',
  'North':      '#2980B9',
  'North-East': '#8E44AD',
  'East':       '#27AE60',
  'West':       '#E67E22',
  'Unknown':    '#95A5A6',
  'All':        '#C0392B',
}

export function getRegion(postalCode) {
  if (!postalCode || postalCode.length < 2) return 'Unknown'
  const sector = String(postalCode).padStart(6, '0').slice(0, 2)
  return SECTOR_REGION[sector] ?? 'Unknown'
}