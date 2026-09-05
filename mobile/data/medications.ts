export type CatalogMedication = {
  id: string;
  genericName: string;
  brandNames: string[];
  category: string;
  commonUse: string;
  form: string;
  source: string;
  reviewedOn: string;
  prescriptionStatus?: 'Prescription' | 'Over-the-counter';
  aliases?: string[];
};

export const MEDICATION_FILTERS = ['All', 'Glaucoma', 'Dry eye', 'Allergy', 'Post-op'] as const;
export type MedicationFilter = typeof MEDICATION_FILTERS[number];

// Starter catalog only. Product packaging and label colors vary by manufacturer.
// Medication instructions must always come from the patient's clinician or bottle label.
export const MEDICATIONS: CatalogMedication[] = [
  { id: 'latanoprost', genericName: 'Latanoprost', brandNames: ['Xalatan'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'timolol', genericName: 'Timolol maleate', brandNames: ['Timoptic'], category: 'Beta blocker', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'brimonidine', genericName: 'Brimonidine tartrate', brandNames: ['Alphagan P'], category: 'Alpha agonist', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'dorzolamide', genericName: 'Dorzolamide hydrochloride', brandNames: ['Trusopt'], category: 'Carbonic anhydrase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'brinzolamide', genericName: 'Brinzolamide', brandNames: ['Azopt'], category: 'Carbonic anhydrase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic suspension', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'prednisolone', genericName: 'Prednisolone acetate', brandNames: ['Pred Forte'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'moxifloxacin', genericName: 'Moxifloxacin hydrochloride', brandNames: ['Vigamox'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'ofloxacin', genericName: 'Ofloxacin', brandNames: ['Ocuflox'], category: 'Antibiotic', commonUse: 'Used for clinician-directed bacterial eye infection treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'ketorolac', genericName: 'Ketorolac tromethamine', brandNames: ['Acular'], category: 'Nonsteroidal anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'cyclosporine', genericName: 'Cyclosporine', brandNames: ['Restasis', 'Cequa'], category: 'Immunomodulator', commonUse: 'Used for clinician-directed dry-eye treatment', form: 'Ophthalmic emulsion or solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'lifitegrast', genericName: 'Lifitegrast', brandNames: ['Xiidra'], category: 'LFA-1 antagonist', commonUse: 'Used for clinician-directed dry-eye treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'olopatadine', genericName: 'Olopatadine hydrochloride', brandNames: ['Patanol', 'Pataday'], category: 'Antihistamine', commonUse: 'Used for eye-allergy symptom treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'pilocarpine', genericName: 'Pilocarpine hydrochloride', brandNames: ['Pilocar'], category: 'Miotic', commonUse: 'Used for clinician-directed eye-pressure treatment', form: 'Ophthalmic solution', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'bimatoprost', genericName: 'Bimatoprost', brandNames: ['Lumigan'], aliases: ['bimatoprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'travoprost', genericName: 'Travoprost', brandNames: ['Travatan Z'], aliases: ['travoprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'tafluprost', genericName: 'Tafluprost', brandNames: ['Zioptan'], aliases: ['tafluprost ophthalmic'], category: 'Prostaglandin analog', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution, single-dose containers', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'netarsudil', genericName: 'Netarsudil', brandNames: ['Rhopressa'], aliases: ['netarsudil ophthalmic'], category: 'Rho kinase inhibitor', commonUse: 'Helps lower eye pressure', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'dorzolamide-timolol', genericName: 'Dorzolamide hydrochloride / timolol maleate', brandNames: ['Cosopt'], aliases: ['dorzolamide timolol', 'cosopt'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'brimonidine-timolol', genericName: 'Brimonidine tartrate / timolol maleate', brandNames: ['Combigan'], aliases: ['brimonidine timolol', 'combigan'], category: 'Combination pressure-lowering drop', commonUse: 'Helps lower eye pressure when clinician-directed', form: 'Ophthalmic solution', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'loteprednol', genericName: 'Loteprednol etabonate', brandNames: ['Lotemax'], aliases: ['loteprednol ophthalmic'], category: 'Corticosteroid anti-inflammatory', commonUse: 'Used for clinician-directed eye inflammation treatment', form: 'Ophthalmic suspension, gel, or ointment', prescriptionStatus: 'Prescription', source: 'RxNorm / DailyMed', reviewedOn: '2026-09-05' },
  { id: 'artificial-tears', genericName: 'Artificial tears', brandNames: ['Refresh', 'Systane'], category: 'Lubricant', commonUse: 'Helps relieve dry-eye symptoms', form: 'Ophthalmic solution or gel', source: 'DailyMed / product label', reviewedOn: '2026-09-05' },
];

export function searchMedications(query: string, filter: MedicationFilter = 'All') {
  const normalized = query.trim().toLowerCase();
  const filterTerms: Record<MedicationFilter, string[]> = { All: [], Glaucoma: ['pressure', 'prostaglandin', 'beta blocker', 'carbonic', 'alpha agonist', 'rho kinase', 'miotic', 'combination pressure'], 'Dry eye': ['dry-eye', 'lubricant', 'immunomodulator', 'lfa-1'], Allergy: ['allergy', 'antihistamine'], 'Post-op': ['anti-inflammatory', 'antibiotic', 'nonsteroidal'] };
  const matchesFilter = (medication: CatalogMedication) => filter === 'All' || filterTerms[filter].some((term) => `${medication.category} ${medication.commonUse}`.toLowerCase().includes(term));
  const matchesQuery = (medication: CatalogMedication) => !normalized || [medication.genericName, medication.category, medication.commonUse, ...medication.brandNames, ...(medication.aliases ?? [])].some((name) => name.toLowerCase().includes(normalized));
  return MEDICATIONS.filter((medication) => matchesFilter(medication) && matchesQuery(medication)).slice(0, 5);
}
