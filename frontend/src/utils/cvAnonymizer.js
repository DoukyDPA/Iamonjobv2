// frontend/src/utils/cvAnonymizer.js
// ⚠️ TOUT se passe côté client, AUCUNE donnée sensible ne quitte le navigateur

export class CVAnonymizer {
  constructor() {
    // Patterns de détection purement regex
    this.patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      phone: /(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}/g,
      
      // Patterns français spécifiques
      postalAddress: /\d{1,4}[\s,]+(?:rue|avenue|boulevard|place|impasse|allée|chemin)[^,\n]{5,50}/gi,
      postalCode: /\b(?:0[1-9]|[1-8][0-9]|9[0-5]|2[AB])\d{3}\b/g,
      
      // Dates de naissance
      birthDate: /(?:né\(?e?\)?\s+le\s+)?\d{1,2}[\s/-]\d{1,2}[\s/-]\d{2,4}/gi,
      age: /\b\d{2}\s*ans\b/gi,
      
      // Numéros sensibles
      socialSecurity: /[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}/g,
      iban: /[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{4}[\s]?[A-Z0-9]{0,8}/g,
      
      // URLs personnelles
      linkedin: /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)[^\s\n,)]+/gi,
      github: /github\.com\/[^\s\n,)]+/gi,
      website: /https?:\/\/[^\s\n,)]+/gi
    };

    // Listes de prénoms/noms français courants pour détection
    this.commonFirstNames = this.loadFirstNames();
    this.commonLastNames = this.loadLastNames();
  }

  anonymizeCV(cvText, options = {}) {
    const level = options.level || 'standard';
    let anonymized = cvText;
    const removedData = {};

    // NIVEAU 1 : Données de contact (TOUJOURS)
    anonymized = this.removeEmails(anonymized, removedData);
    anonymized = this.removePhones(anonymized, removedData);
    anonymized = this.removeAddresses(anonymized, removedData);
    anonymized = this.removeSocialMedia(anonymized, removedData);

    // NIVEAU 2 : Données personnelles (standard et strict)
    if (level === 'standard' || level === 'strict') {
      anonymized = this.removeBirthInfo(anonymized, removedData);
      anonymized = this.removeNationality(anonymized, removedData);
      anonymized = this.removeMaritalStatus(anonymized, removedData);
      anonymized = this.removePhoto(anonymized, removedData);
    }

    // NIVEAU 3 : Noms propres (strict uniquement)
    if (level === 'strict') {
      anonymized = this.removeNames(anonymized, removedData);
      anonymized = this.anonymizeCompanies(anonymized, removedData);
      anonymized = this.anonymizeSchools(anonymized, removedData);
    }

    return {
      originalText: cvText,
      anonymizedText: anonymized,
      removedData: removedData,
      level: level,
      timestamp: new Date().toISOString()
    };
  }

  removeEmails(text, removedData) {
    const emails = text.match(this.patterns.email) || [];
    removedData.emails = emails;
    
    return text.replace(this.patterns.email, '[EMAIL_SUPPRIMÉ]');
  }

  removePhones(text, removedData) {
    const phones = text.match(this.patterns.phone) || [];
    removedData.phones = phones;
    
    return text.replace(this.patterns.phone, '[TÉLÉPHONE_SUPPRIMÉ]');
  }

  removeAddresses(text, removedData) {
    // Adresses complètes
    const addresses = text.match(this.patterns.postalAddress) || [];
    removedData.addresses = addresses;
    text = text.replace(this.patterns.postalAddress, '[ADRESSE_SUPPRIMÉE]');
    
    // Codes postaux isolés
    text = text.replace(this.patterns.postalCode, '[CP]');
    
    return text;
  }

  removeNames(text, removedData) {
    // Détection intelligente basée sur position et contexte
    const lines = text.split('\n');
    const namePatterns = [];
    
    // Chercher dans les premières lignes (souvent le nom)
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      // Ligne avec 2-3 mots capitalisés = probablement nom
      const words = line.split(/\s+/);
      const capitalizedWords = words.filter(w => 
        w.length > 2 && w[0] === w[0].toUpperCase()
      );
      
      if (capitalizedWords.length >= 2 && capitalizedWords.length <= 3) {
        // Vérifier si ça ressemble à un nom
        if (this.looksLikeName(capitalizedWords)) {
          namePatterns.push(line);
          lines[i] = '[NOM_SUPPRIMÉ]';
        }
      }
    }
    
    removedData.names = namePatterns;
    return lines.join('\n');
  }

  anonymizeCompanies(text, removedData) {
    // Patterns pour détecter les entreprises
    const companyPatterns = [
      /(?:chez|société|entreprise|groupe|SA|SARL|SAS|EURL)\s+[A-Z][A-Za-z\s&-]+/g,
      /[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+(?:SA|SAS|SARL|EURL|Group|France)/g
    ];
    
    const companies = [];
    companyPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      companies.push(...matches);
      text = text.replace(pattern, '[ENTREPRISE_SECTEUR_X]');
    });
    
    removedData.companies = companies;
    return text;
  }

  anonymizeSchools(text, removedData) {
    // Patterns pour écoles et universités
    const schoolPatterns = [
      /(?:université|faculté|école|lycée|collège|iut|bts)\s+(?:de\s+)?[A-Za-z\s-]+/gi,
      /[A-Z]{2,}[\s-]?[A-Z]*\s*(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Bordeaux)/g
    ];
    
    const schools = [];
    schoolPatterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      schools.push(...matches);
      text = text.replace(pattern, '[ÉTABLISSEMENT_FORMATION]');
    });
    
    removedData.schools = schools;
    return text;
  }

  // Helpers
  looksLikeName(words) {
    // Vérifier si au moins un mot est dans nos listes de prénoms/noms
    return words.some(word => 
      this.commonFirstNames.includes(word.toUpperCase()) ||
      this.commonLastNames.includes(word.toUpperCase())
    );
  }

  loadFirstNames() {
    // Top 100 prénoms français (à compléter)
    return [
      'JEAN', 'MARIE', 'PIERRE', 'MICHEL', 'ANDRÉ', 'PHILIPPE', 'ALAIN',
      'BERNARD', 'JACQUES', 'DANIEL', 'FRANÇOIS', 'PATRICK', 'CHRISTIAN',
      'SOPHIE', 'ISABELLE', 'NATHALIE', 'SYLVIE', 'CATHERINE', 'CHRISTINE'
      // ... ajouter plus de prénoms
    ];
  }

  loadLastNames() {
    // Top 100 noms français (à compléter)
    return [
      'MARTIN', 'BERNARD', 'DUBOIS', 'THOMAS', 'ROBERT', 'RICHARD',
      'PETIT', 'DURAND', 'LEROY', 'MOREAU', 'SIMON', 'LAURENT', 'LEFEBVRE'
      // ... ajouter plus de noms
    ];
  }
}
