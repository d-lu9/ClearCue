export type CatalogMedication = {
  id: string;
  genericName: string;
  brandNames: string[];
  category: string;
  commonUse: string;
  form: string;
  source: string;
  reviewedOn: string;
  prescriptionStatus?: 'Prescription' | 'Over-the-counter' | 'Prescription or over-the-counter';
  aliases?: string[];
};

export const MEDICATION_FILTERS = [
  'All',
  'Glaucoma',
  'Dry eye & lubricants',
  'Allergy',
  'Infection',
  'Inflammation & post-op',
  'Redness relief',
] as const;
export type MedicationFilter = typeof MEDICATION_FILTERS[number];

// This is a recognition aid, not a treatment reference. The bundled catalog is
// reviewed against the current DailyMed label and cross-checked in FDA openFDA
// before release. Product packaging, availability, and label details can vary.
// Medication instructions must always come from the patient's clinician or bottle label.
const OFFICIAL_SOURCE = 'DailyMed label + FDA openFDA';
const REVIEWED_ON = '2026-09-06';

export const MEDICATIONS: CatalogMedication[] = [
  // Glaucoma and ocular-hypertension drops
  { id: 'latanoprost', genericName: 'Latanoprost', brandNames: ['Xalatan'], aliases: ['latanoprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'bimatoprost', genericName: 'Bimatoprost', brandNames: ['Lumigan'], aliases: ['bimatoprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'travoprost', genericName: 'Travoprost', brandNames: ['Travatan Z'], aliases: ['travoprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'tafluprost', genericName: 'Tafluprost', brandNames: ['Zioptan'], aliases: ['tafluprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution, single-dose containers', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'timolol', genericName: 'Timolol maleate', brandNames: ['Timoptic'], aliases: ['timolol ophthalmic'], category: 'Beta blocker', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'betaxolol', genericName: 'Betaxolol hydrochloride', brandNames: ['Betoptic S'], aliases: ['betaxolol ophthalmic'], category: 'Beta blocker', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'brimonidine', genericName: 'Brimonidine tartrate', brandNames: ['Alphagan P'], aliases: ['brimonidine ophthalmic'], category: 'Alpha agonist', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'dorzolamide', genericName: 'Dorzolamide hydrochloride', brandNames: ['Trusopt'], aliases: ['dorzolamide ophthalmic'], category: 'Carbonic anhydrase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'brinzolamide', genericName: 'Brinzolamide', brandNames: ['Azopt'], aliases: ['brinzolamide ophthalmic'], category: 'Carbonic anhydrase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'pilocarpine', genericName: 'Pilocarpine hydrochloride', brandNames: ['Pilocar'], aliases: ['pilocarpine ophthalmic'], category: 'Miotic', commonUse: 'Used for clinician-directed eye-pressure treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'netarsudil', genericName: 'Netarsudil', brandNames: ['Rhopressa'], aliases: ['netarsudil ophthalmic'], category: 'Rho kinase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'dorzolamide-timolol', genericName: 'Dorzolamide hydrochloride / timolol maleate', brandNames: ['Cosopt'], aliases: ['dorzolamide timolol', 'cosopt'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'brimonidine-timolol', genericName: 'Brimonidine tartrate / timolol maleate', brandNames: ['Combigan'], aliases: ['brimonidine timolol', 'combigan'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'brinzolamide-brimonidine', genericName: 'Brinzolamide / brimonidine tartrate', brandNames: ['Simbrinza'], aliases: ['brinzolamide brimonidine', 'simbrinza'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'netarsudil-latanoprost', genericName: 'Netarsudil / latanoprost', brandNames: ['Rocklatan'], aliases: ['netarsudil latanoprost', 'rocklatan'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

  // Dry-eye drops
  { id: 'cyclosporine', genericName: 'Cyclosporine', brandNames: ['Restasis', 'Cequa'], aliases: ['cyclosporine ophthalmic'], category: 'Immunomodulator', commonUse: 'Used for clinician-directed dry-eye treatment', form: 'Ophthalmic emulsion or solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'lifitegrast', genericName: 'Lifitegrast', brandNames: ['Xiidra'], aliases: ['lifitegrast ophthalmic'], category: 'LFA-1 antagonist', commonUse: 'Used for clinician-directed dry-eye treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'perfluorohexyloctane', genericName: 'Perfluorohexyloctane', brandNames: ['Miebo'], aliases: ['miebo'], category: 'Semifluorinated alkane', commonUse: 'Used for clinician-directed dry-eye treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'artificial-tears', genericName: 'Artificial tears', brandNames: ['Refresh', 'Systane'], aliases: ['lubricant drops'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution or gel', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'carboxymethylcellulose', genericName: 'Carboxymethylcellulose sodium', brandNames: [], aliases: ['cmc', 'carboxymethylcellulose ophthalmic'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution or gel', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'hypromellose', genericName: 'Hypromellose', brandNames: [], aliases: ['hydroxypropyl methylcellulose', 'hpmc', 'hypromellose ophthalmic'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution or gel', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'peg-propylene-glycol', genericName: 'Polyethylene glycol 400 / propylene glycol', brandNames: ['Systane'], aliases: ['peg 400 propylene glycol', 'polyethylene glycol propylene glycol'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'glycerin', genericName: 'Glycerin', brandNames: [], aliases: ['glycerin ophthalmic'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

  // Allergy drops
  { id: 'olopatadine', genericName: 'Olopatadine hydrochloride', brandNames: ['Patanol', 'Pataday'], aliases: ['olopatadine ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription or over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'ketotifen', genericName: 'Ketotifen fumarate', brandNames: ['Zaditor', 'Alaway'], aliases: ['ketotifen ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'alcaftadine', genericName: 'Alcaftadine', brandNames: ['Lastacaft'], aliases: ['alcaftadine ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'azelastine', genericName: 'Azelastine hydrochloride', brandNames: ['Optivar'], aliases: ['azelastine ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'cromolyn', genericName: 'Cromolyn sodium', brandNames: ['Crolom'], aliases: ['cromolyn ophthalmic'], category: 'Mast cell stabilizer', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

  // Clinician-directed anti-inflammatory and antibiotic drops, including common post-operative regimens
  { id: 'prednisolone', genericName: 'Prednisolone acetate', brandNames: ['Pred Forte'], aliases: ['prednisolone ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'loteprednol', genericName: 'Loteprednol etabonate', brandNames: ['Lotemax'], aliases: ['loteprednol ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension, gel, or ointment', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'difluprednate', genericName: 'Difluprednate', brandNames: ['Durezol'], aliases: ['difluprednate ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic emulsion', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'ketorolac', genericName: 'Ketorolac tromethamine', brandNames: ['Acular'], aliases: ['ketorolac ophthalmic'], category: 'Nonsteroidal anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'bromfenac', genericName: 'Bromfenac sodium', brandNames: ['Prolensa'], aliases: ['bromfenac ophthalmic'], category: 'Nonsteroidal anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'nepafenac', genericName: 'Nepafenac', brandNames: ['Ilevro', 'Nevanac'], aliases: ['nepafenac ophthalmic'], category: 'Nonsteroidal anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'moxifloxacin', genericName: 'Moxifloxacin hydrochloride', brandNames: ['Vigamox'], aliases: ['moxifloxacin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'ofloxacin', genericName: 'Ofloxacin', brandNames: ['Ocuflox'], aliases: ['ofloxacin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'besifloxacin', genericName: 'Besifloxacin', brandNames: ['Besivance'], aliases: ['besifloxacin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic suspension', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'erythromycin', genericName: 'Erythromycin', brandNames: [], aliases: ['erythromycin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic ointment', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'tobramycin', genericName: 'Tobramycin', brandNames: ['Tobrex'], aliases: ['tobramycin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution or ointment', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'ciprofloxacin', genericName: 'Ciprofloxacin hydrochloride', brandNames: ['Ciloxan'], aliases: ['ciprofloxacin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution or ointment', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'gentamicin', genericName: 'Gentamicin sulfate', brandNames: [], aliases: ['gentamicin ophthalmic'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'tobramycin-dexamethasone', genericName: 'Tobramycin / dexamethasone', brandNames: ['Tobradex'], aliases: ['tobramycin dexamethasone', 'tobradex'], category: 'Antibiotic and corticosteroid combination', commonUse: 'Used for clinician-directed eye inflammation when an antibacterial component is needed', form: 'Ophthalmic suspension or ointment', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'fluorometholone', genericName: 'Fluorometholone', brandNames: ['FML'], aliases: ['fluorometholone ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension or solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'dexamethasone', genericName: 'Dexamethasone', brandNames: ['Maxidex'], aliases: ['dexamethasone sodium phosphate', 'dexamethasone ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension or solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

  // Over-the-counter redness-relief drops
  { id: 'naphazoline', genericName: 'Naphazoline hydrochloride', brandNames: [], aliases: ['naphazoline ophthalmic', 'naphazoline pheniramine'], category: 'Decongestant', commonUse: 'Temporarily relieves eye redness from minor irritation', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'tetrahydrozoline', genericName: 'Tetrahydrozoline hydrochloride', brandNames: [], aliases: ['tetrahydrozoline ophthalmic'], category: 'Decongestant', commonUse: 'Temporarily relieves eye redness from minor irritation', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

  // Additional common pressure-lowering drops confirmed in official labeling
  { id: 'apraclonidine', genericName: 'Apraclonidine hydrochloride', brandNames: ['Iopidine'], aliases: ['apraclonidine ophthalmic'], category: 'Alpha agonist', commonUse: 'Used for clinician-directed short-term eye-pressure treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'carteolol', genericName: 'Carteolol hydrochloride', brandNames: ['Ocupress'], aliases: ['carteolol ophthalmic'], category: 'Beta blocker', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
];

export function searchMedications(query: string, filter: MedicationFilter = 'All') {
  const normalized = query.trim().toLowerCase();
  const filterTerms: Record<MedicationFilter, string[]> = {
    All: [],
    Glaucoma: ['pressure', 'prostaglandin', 'beta blocker', 'carbonic', 'alpha agonist', 'rho kinase', 'miotic', 'combination pressure'],
    'Dry eye & lubricants': ['dry-eye', 'lubricant', 'immunomodulator', 'lfa-1', 'semifluorinated'],
    Allergy: ['allergy', 'antihistamine', 'mast cell'],
    Infection: ['antibiotic'],
    'Inflammation & post-op': ['anti-inflammatory', 'nonsteroidal', 'corticosteroid'],
    'Redness relief': ['redness reliever', 'decongestant'],
  };
  const matchesFilter = (medication: CatalogMedication) => filter === 'All' || filterTerms[filter].some((term) => `${medication.category} ${medication.commonUse}`.toLowerCase().includes(term));
  const matchesQuery = (medication: CatalogMedication) => !normalized || [medication.genericName, medication.category, medication.commonUse, ...medication.brandNames, ...(medication.aliases ?? [])].some((name) => name.toLowerCase().includes(normalized));
  return MEDICATIONS.filter((medication) => matchesFilter(medication) && matchesQuery(medication));
}

// Different manufacturers can publish separate current labels for the same
// medication. A medication-specific DailyMed search is more reliable than
// pinning a user to one manufacturer or an outdated label version.
export function medicationDailyMedUrl(medication: CatalogMedication) {
  return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(medication.genericName)}`;
}
