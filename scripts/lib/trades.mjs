// Trade catalog: maps a Google Business Profile category to everything the
// template needs — schema.org type, accent color, copy nouns, and the
// category-typical services (the "assumed slot": when an owner replies
// "we don't do X", that conversation IS the sale).

const TRADES = {
  electrician: {
    match: ['electrician', 'electrical installation', 'electric'],
    trade_noun: 'electrician',
    trade_work: 'electrical work',
    schema_type: 'Electrician',
    accent: '#f5c400',
    services: [
      { title: 'Panel upgrades', blurb: 'Replace outdated or overloaded panels so your home handles modern demand safely.' },
      { title: 'Wiring & repairs', blurb: 'Troubleshooting, rewiring, outlets, and switches — old houses welcome.' },
      { title: 'Lighting', blurb: 'Indoor, outdoor, and landscape lighting, installed and wired to code.' },
      { title: 'EV chargers', blurb: 'Level 2 home charger installation, sized correctly for your panel.' },
      { title: 'Generators', blurb: "Standby generator hookups so the next outage isn't your problem." },
      { title: 'Inspections', blurb: 'Pre-sale and safety inspections with a straight answer about what you actually need.' },
    ],
  },
  plumber: {
    match: ['plumber', 'plumbing'],
    trade_noun: 'plumber',
    trade_work: 'plumbing work',
    schema_type: 'Plumber',
    accent: '#2e86de',
    services: [
      { title: 'Repairs & leaks', blurb: 'Dripping faucets, running toilets, hidden leaks — found and fixed.' },
      { title: 'Drain cleaning', blurb: 'Slow or clogged drains cleared properly, not just for the weekend.' },
      { title: 'Water heaters', blurb: 'Tank and tankless installs, sized right for your household.' },
      { title: 'Sewer lines', blurb: 'Camera inspections and repairs with a straight answer about what you need.' },
      { title: 'Fixture installs', blurb: 'Sinks, toilets, and showers installed clean and to code.' },
      { title: 'Emergency service', blurb: "When a pipe lets go, you need someone who shows up. We do." },
    ],
  },
  hvac: {
    match: ['hvac', 'air conditioning', 'heating', 'furnace'],
    trade_noun: 'HVAC contractor',
    trade_work: 'heating and cooling work',
    schema_type: 'HVACBusiness',
    accent: '#17b3a6',
    services: [
      { title: 'AC installation', blurb: 'Central air and ductless systems sized right for your home.' },
      { title: 'Heating repair', blurb: 'Furnaces and boilers diagnosed and fixed before the cold settles in.' },
      { title: 'Maintenance plans', blurb: 'Seasonal tune-ups that catch small problems while they’re still small.' },
      { title: 'Ductwork', blurb: 'Duct repair, sealing, and new runs that actually move air.' },
      { title: 'Heat pumps', blurb: 'High-efficiency heat pump installs, with rebates handled.' },
      { title: 'Indoor air quality', blurb: 'Filtration and humidity control for a house that breathes right.' },
    ],
  },
  roofer: {
    match: ['roofing', 'roofer'],
    trade_noun: 'roofer',
    trade_work: 'roofing work',
    schema_type: 'RoofingContractor',
    accent: '#e17055',
    services: [
      { title: 'Roof replacement', blurb: 'Full tear-offs and re-roofs with materials that last.' },
      { title: 'Leak repair', blurb: 'Leaks traced to the source and fixed — not patched over.' },
      { title: 'Storm damage', blurb: 'Inspections and repairs after wind and hail, insurance paperwork included.' },
      { title: 'Gutters', blurb: 'Gutters and leaders installed and pitched to actually drain.' },
      { title: 'Flat roofs', blurb: 'Commercial and residential flat roofing done to spec.' },
      { title: 'Inspections', blurb: 'Honest roof assessments — we tell you when you don’t need a new roof.' },
    ],
  },
  landscaper: {
    match: ['landscap', 'lawn care', 'gardener', 'tree service'],
    trade_noun: 'landscaper',
    trade_work: 'landscaping work',
    schema_type: 'LandscapingBusiness',
    accent: '#27ae60',
    services: [
      { title: 'Lawn maintenance', blurb: 'Weekly cuts, edging, and cleanups that keep the yard sharp.' },
      { title: 'Design & planting', blurb: 'Beds, borders, and plantings chosen for what actually thrives here.' },
      { title: 'Hardscaping', blurb: 'Patios, walkways, and retaining walls built to stay put.' },
      { title: 'Spring & fall cleanups', blurb: 'Seasonal cleanups that reset the property properly.' },
      { title: 'Irrigation', blurb: 'Sprinkler installs, repairs, and seasonal turn-ons and blowouts.' },
      { title: 'Tree & shrub care', blurb: 'Pruning and removals done safely and cleaned up completely.' },
    ],
  },
  autorepair: {
    match: ['auto repair', 'car repair', 'transmission', 'brake shop', 'mechanic', 'auto electrical'],
    trade_noun: 'auto repair shop',
    trade_work: 'auto repair',
    schema_type: 'AutoRepair',
    accent: '#e74c3c',
    services: [
      { title: 'Diagnostics', blurb: 'Check-engine lights read and explained in plain English.' },
      { title: 'Brakes', blurb: 'Pads, rotors, and lines replaced with quality parts.' },
      { title: 'Oil & maintenance', blurb: 'Scheduled maintenance that keeps the warranty intact.' },
      { title: 'Suspension & steering', blurb: 'Shocks, struts, and alignments for a car that drives straight.' },
      { title: 'Electrical', blurb: 'Batteries, alternators, and wiring gremlins tracked down.' },
      { title: 'Inspections', blurb: 'NY State inspections done while you wait.' },
    ],
  },
  appliance: {
    match: ['appliance repair', 'appliance store'],
    trade_noun: 'appliance repair service',
    trade_work: 'appliance repair',
    schema_type: 'HomeAndConstructionBusiness',
    accent: '#8e7cc3',
    services: [
      { title: 'Refrigerators', blurb: 'Not cooling, leaking, or icing up — diagnosed and repaired fast.' },
      { title: 'Washers & dryers', blurb: 'From no-spin to no-heat, fixed with factory parts.' },
      { title: 'Ovens & ranges', blurb: 'Gas and electric ranges repaired safely and to spec.' },
      { title: 'Dishwashers', blurb: 'Leaks, drainage, and racks that won’t latch — handled.' },
      { title: 'Same-week service', blurb: 'Most repairs scheduled within days, not weeks.' },
      { title: 'Honest assessments', blurb: 'If it’s cheaper to replace than repair, we’ll say so.' },
    ],
  },
  contractor: {
    match: ['general contractor', 'home builder', 'construction', 'remodeler'],
    trade_noun: 'contractor',
    trade_work: 'construction work',
    schema_type: 'GeneralContractor',
    accent: '#f39c12',
    services: [
      { title: 'Remodeling', blurb: 'Kitchens, baths, and basements done on schedule and to code.' },
      { title: 'Additions', blurb: 'Extensions and dormers that match the house they’re built onto.' },
      { title: 'Repairs', blurb: 'The punch list of small jobs other contractors won’t return calls for.' },
      { title: 'Decks & exteriors', blurb: 'Decks, siding, and trim built to handle the weather.' },
      { title: 'Project management', blurb: 'Permits, inspections, and subs coordinated so you don’t have to.' },
      { title: 'Estimates', blurb: 'Clear written estimates before work starts. No surprises.' },
    ],
  },
};

const GENERIC = {
  trade_noun: 'local pros',
  trade_work: 'work',
  schema_type: 'LocalBusiness',
  accent: '#f5c400',
  services: [
    { title: 'Repairs', blurb: 'Problems diagnosed honestly and fixed right the first time.' },
    { title: 'Installations', blurb: 'New installs done clean, to code, and on schedule.' },
    { title: 'Maintenance', blurb: 'Regular upkeep that prevents the expensive surprises.' },
    { title: 'Free estimates', blurb: 'Clear pricing before any work starts.' },
    { title: 'Emergency service', blurb: 'When it can’t wait, we pick up the phone.' },
    { title: 'Local & insured', blurb: 'Fully licensed and insured, and we live where we work.' },
  ],
};

export function tradeFor(category = '') {
  const low = (category || '').toLowerCase();
  for (const t of Object.values(TRADES)) {
    if (t.match.some((m) => low.includes(m))) return t;
  }
  return GENERIC;
}
