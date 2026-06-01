export interface RecourseChannel {
  id: string;
  title: string;
  when: string;
  detail: string;
  actionLabel: string;
  actionUrl: string;
  legalBasis: string;
}

// Verified statutory channels, accurate during the BBMP -> GBA transition.
// Update the GBA note after the June 2026 corporation elections conclude.
export const CIVIC_RECOURSE: RecourseChannel[] = [
  {
    id: 'rti',
    title: 'File an RTI',
    when: 'When BBMP has not responded past the SLA',
    detail:
      'The Right to Information Act compels a written response within 30 days. Costs Rs.10. Nammooru drafts the notice for you when a report is escalated.',
    actionLabel: 'File RTI online',
    actionUrl: 'https://bbmpaponline.in',
    legalBasis: 'RTI Act 2005, Section 6(1)',
  },
  {
    id: 'lokayukta',
    title: 'Approach the Karnataka Lokayukta',
    when: 'When a public official ignores a statutory duty',
    detail:
      'The Lokayukta investigates administrative failure and corruption by public servants. A documented, ignored complaint with a report ID is strong supporting evidence.',
    actionLabel: 'Karnataka Lokayukta',
    actionUrl: 'https://lokayukta.karnataka.gov.in',
    legalBasis: 'Karnataka Lokayukta Act 1984',
  },
  {
    id: 'cpgrams',
    title: 'Escalate via CPGRAMS',
    when: 'For persistent unresolved grievances',
    detail:
      'The central public grievance portal routes complaints to the relevant department and tracks them with a national reference number.',
    actionLabel: 'pgportal.gov.in',
    actionUrl: 'https://pgportal.gov.in',
    legalBasis: 'DARPG, Government of India',
  },
];

export const GOVERNANCE_NOTE = {
  headline: 'Bengaluru has had no elected city council since September 2020.',
  body:
    'BBMP is being reorganised into the Greater Bengaluru Authority. Until the corporation elections conclude, the city is run by administrators — there is no elected corporator to chase your complaint. Administrative escalation and statutory tools like RTI are the channels that work right now. Nammooru automates them.',
  electionNote: 'GBA corporation elections were ordered by the Supreme Court to conclude by 30 June 2026.',
};
