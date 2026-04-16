import type { WardData } from './types'

const wards: WardData[] = [
  {
    ward_name:     'Whitefield',
    officer_name:  'Rajesh Nataraj',
    officer_email: 'rajesh.nataraj@bbmp.gov.in',
    zone:          'East',
  },
  {
    ward_name:     'HSR Layout',
    officer_name:  'Kavitha Suresh',
    officer_email: 'kavitha.suresh@bbmp.gov.in',
    zone:          'South',
  },
  {
    ward_name:     'Koramangala',
    officer_name:  'Sunil Venkatesh',
    officer_email: 'sunil.venkatesh@bbmp.gov.in',
    zone:          'South',
  },
  {
    ward_name:     'Indiranagar',
    officer_name:  'Meena Prakash',
    officer_email: 'meena.prakash@bbmp.gov.in',
    zone:          'Central',
  },
  {
    ward_name:     'Jayanagar',
    officer_name:  'Deepak Murthy',
    officer_email: 'deepak.murthy@bbmp.gov.in',
    zone:          'South',
  },
]

export default wards

export function getWard(wardName: string): WardData | undefined {
  return wards.find((w) => w.ward_name === wardName)
}
