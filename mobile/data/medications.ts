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

export const MEDICATION_FILTERS = ['All', 'Glaucoma', 'Dry eye', 'Allergy', 'Post-op'] as const;
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

  // Allergy drops
  { id: 'olopatadine', genericName: 'Olopatadine hydrochloride', brandNames: ['Patanol', 'Pataday'], aliases: ['olopatadine ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription or over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'ketotifen', genericName: 'Ketotifen fumarate', brandNames: ['Zaditor', 'Alaway'], aliases: ['ketotifen ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', prescriptionStatus: 'Over-the-counter', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },
  { id: 'alcaftadine', genericName: 'Alcaftadine', brandNames: ['Lastacaft'], aliases: ['alcaftadine ophthalmic'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', source: OFFICIAL_SOURCE, reviewedOn: REVIEWED_ON },

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
];

export function searchMedications(query: string, filter: MedicationFilter = 'All') {
  const normalized = query.trim().toLowerCase();
  const filterTerms: Record<MedicationFilter, string[]> = { All: [], Glaucoma: ['pressure', 'prostaglandin', 'beta blocker', 'carbonic', 'alpha agonist', 'rho kinase', 'miotic', 'combination pressure'], 'Dry eye': ['dry-eye', 'lubricant', 'immunomodulator', 'lfa-1', 'semifluorinated'], Allergy: ['allergy', 'antihistamine'], 'Post-op': ['anti-inflammatory', 'antibiotic', 'nonsteroidal'] };
  const matchesFilter = (medication: CatalogMedication) => filter === 'All' || filterTerms[filter].some((term) => `${medication.category} ${medication.commonUse}`.toLowerCase().includes(term));
  const matchesQuery = (medication: CatalogMedication) => !normalized || [medication.genericName, medication.category, medication.commonUse, ...medication.brandNames, ...(medication.aliases ?? [])].some((name) => name.toLowerCase().includes(normalized));
  return MEDICATIONS.filter((medication) => matchesFilter(medication) && matchesQuery(medication)).slice(0, 5);
}
