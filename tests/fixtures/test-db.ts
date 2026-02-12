/**
 * Test database fixture with Swedish law sample data.
 */

import Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE legal_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('statute', 'bill', 'sou', 'ds', 'case_law')),
  title TEXT NOT NULL,
  title_en TEXT,
  short_name TEXT,
  status TEXT NOT NULL DEFAULT 'in_force'
    CHECK(status IN ('in_force', 'amended', 'repealed', 'not_yet_in_force')),
  issued_date TEXT,
  in_force_date TEXT,
  url TEXT,
  description TEXT,
  last_updated TEXT DEFAULT (datetime('now'))
);

CREATE TABLE legal_provisions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  UNIQUE(document_id, provision_ref)
);

CREATE INDEX idx_provisions_doc ON legal_provisions(document_id);
CREATE INDEX idx_provisions_chapter ON legal_provisions(document_id, chapter);

CREATE VIRTUAL TABLE provisions_fts USING fts5(
  content, title,
  content='legal_provisions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provisions_ai AFTER INSERT ON legal_provisions BEGIN
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provisions_ad AFTER DELETE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provisions_au AFTER UPDATE ON legal_provisions BEGIN
  INSERT INTO provisions_fts(provisions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provisions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TABLE legal_provision_versions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  provision_ref TEXT NOT NULL,
  chapter TEXT,
  section TEXT NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  valid_from TEXT,
  valid_to TEXT
);

CREATE INDEX idx_provision_versions_doc_ref ON legal_provision_versions(document_id, provision_ref);

CREATE VIRTUAL TABLE provision_versions_fts USING fts5(
  content, title,
  content='legal_provision_versions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER provision_versions_ai AFTER INSERT ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TRIGGER provision_versions_ad AFTER DELETE ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(provision_versions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
END;

CREATE TRIGGER provision_versions_au AFTER UPDATE ON legal_provision_versions BEGIN
  INSERT INTO provision_versions_fts(provision_versions_fts, rowid, content, title)
  VALUES ('delete', old.id, old.content, old.title);
  INSERT INTO provision_versions_fts(rowid, content, title)
  VALUES (new.id, new.content, new.title);
END;

CREATE TABLE case_law (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL UNIQUE REFERENCES legal_documents(id),
  court TEXT NOT NULL,
  case_number TEXT,
  decision_date TEXT,
  summary TEXT,
  keywords TEXT
);

CREATE VIRTUAL TABLE case_law_fts USING fts5(
  summary, keywords,
  content='case_law',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER case_law_ai AFTER INSERT ON case_law BEGIN
  INSERT INTO case_law_fts(rowid, summary, keywords)
  VALUES (new.id, new.summary, new.keywords);
END;

CREATE TRIGGER case_law_ad AFTER DELETE ON case_law BEGIN
  INSERT INTO case_law_fts(case_law_fts, rowid, summary, keywords)
  VALUES ('delete', old.id, old.summary, old.keywords);
END;

CREATE TABLE preparatory_works (
  id INTEGER PRIMARY KEY,
  statute_id TEXT NOT NULL REFERENCES legal_documents(id),
  prep_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  title TEXT,
  summary TEXT
);

CREATE INDEX idx_prep_statute ON preparatory_works(statute_id);

CREATE VIRTUAL TABLE prep_works_fts USING fts5(
  title, summary,
  content='preparatory_works',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER prep_works_ai AFTER INSERT ON preparatory_works BEGIN
  INSERT INTO prep_works_fts(rowid, title, summary)
  VALUES (new.id, new.title, new.summary);
END;

CREATE TRIGGER prep_works_ad AFTER DELETE ON preparatory_works BEGIN
  INSERT INTO prep_works_fts(prep_works_fts, rowid, title, summary)
  VALUES ('delete', old.id, old.title, old.summary);
END;

CREATE TABLE cross_references (
  id INTEGER PRIMARY KEY,
  source_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  source_provision_ref TEXT,
  target_document_id TEXT NOT NULL REFERENCES legal_documents(id),
  target_provision_ref TEXT,
  ref_type TEXT NOT NULL DEFAULT 'references'
    CHECK(ref_type IN ('references', 'amended_by', 'implements', 'see_also'))
);

CREATE INDEX idx_xref_source ON cross_references(source_document_id);
CREATE INDEX idx_xref_target ON cross_references(target_document_id);

CREATE TABLE definitions (
  id INTEGER PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id),
  term TEXT NOT NULL,
  term_en TEXT,
  definition TEXT NOT NULL,
  source_provision TEXT,
  UNIQUE(document_id, term)
);

CREATE VIRTUAL TABLE definitions_fts USING fts5(
  term, definition,
  content='definitions',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER definitions_ai AFTER INSERT ON definitions BEGIN
  INSERT INTO definitions_fts(rowid, term, definition)
  VALUES (new.id, new.term, new.definition);
END;

CREATE TRIGGER definitions_ad AFTER DELETE ON definitions BEGIN
  INSERT INTO definitions_fts(definitions_fts, rowid, term, definition)
  VALUES ('delete', old.id, old.term, old.definition);
END;
`;

const SAMPLE_DOCUMENTS = [
  { id: '2018:218', type: 'statute', title: 'Lag med kompletterande bestämmelser till EU:s dataskyddsförordning', title_en: 'Act with supplementary provisions to the EU GDPR', short_name: 'DSL', status: 'in_force', issued_date: '2018-04-19', in_force_date: '2018-05-25', url: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/lag-2018218-med-kompletterande-bestammelser_sfs-2018-218/', description: 'Kompletterande bestämmelser till GDPR' },
  { id: '1998:204', type: 'statute', title: 'Personuppgiftslag', title_en: 'Personal Data Act', short_name: 'PUL', status: 'repealed', issued_date: '1998-04-29', in_force_date: '1998-10-24', url: null, description: 'Upphävd 2018-05-25 genom SFS 2018:218' },
  { id: '2017/18:105', type: 'bill', title: 'Ny dataskyddslag', title_en: 'New Data Protection Act', short_name: null, status: 'in_force', issued_date: '2018-02-15', in_force_date: null, url: null, description: 'Proposition om kompletterande bestämmelser till GDPR' },
  { id: '2017:39', type: 'sou', title: 'Ny dataskyddslag - Kompletterande bestämmelser till EU:s dataskyddsförordning', title_en: null, short_name: null, status: 'in_force', issued_date: '2017-05-12', in_force_date: null, url: null, description: 'Utredning om kompletterande dataskyddsbestämmelser' },
  { id: 'NJA 2020', type: 'case_law', title: 'NJA 2020 s. 45', title_en: null, short_name: null, status: 'in_force', issued_date: '2020-03-15', in_force_date: null, url: null, description: 'Avgörande om personuppgiftsbehandling' },
  { id: 'HFD 2019', type: 'case_law', title: 'HFD 2019 ref. 12', title_en: null, short_name: null, status: 'in_force', issued_date: '2019-06-20', in_force_date: null, url: null, description: 'Avgörande om tillsyn enligt dataskyddslagen' },
];

const SAMPLE_PROVISIONS = [
  { document_id: '2018:218', provision_ref: '1:1', chapter: '1', section: '1', title: 'Lagens syfte', content: 'Denna lag kompletterar Europaparlamentets och rådets förordning (EU) 2016/679 av den 27 april 2016 om skydd för fysiska personer med avseende på behandling av personuppgifter och om det fria flödet av sådana uppgifter och om upphävande av direktiv 95/46/EG (allmän dataskyddsförordning).' },
  { document_id: '2018:218', provision_ref: '1:2', chapter: '1', section: '2', title: 'Lagens tillämpningsområde', content: 'Denna lag gäller vid behandling av personuppgifter som helt eller delvis företas på automatisk väg och vid annan behandling av personuppgifter som ingår i eller kommer att ingå i ett register.' },
  { document_id: '2018:218', provision_ref: '1:3', chapter: '1', section: '3', title: null, content: 'Lagen gäller inte för behandling av personuppgifter som en fysisk person utför som ett led i verksamhet av rent privat natur.' },
  { document_id: '2018:218', provision_ref: '2:1', chapter: '2', section: '1', title: 'Rättslig grund för behandling av personuppgifter', content: 'Personuppgifter får behandlas med stöd av artikel 6.1 e i EU:s dataskyddsförordning, om behandlingen är nödvändig för att utföra en uppgift av allmänt intresse.' },
  { document_id: '2018:218', provision_ref: '2:2', chapter: '2', section: '2', title: 'Behandling som rör ett viktigt allmänt intresse', content: 'Personuppgifter som avses i artikel 9.1 i EU:s dataskyddsförordning (känsliga personuppgifter) får behandlas av en myndighet med stöd av artikel 9.2 g i förordningen under förutsättning att behandlingen är nödvändig med hänsyn till ett viktigt allmänt intresse.' },
  { document_id: '2018:218', provision_ref: '3:1', chapter: '3', section: '1', title: 'Tillsynsmyndighet', content: 'Integritetsskyddsmyndigheten är tillsynsmyndighet enligt EU:s dataskyddsförordning.' },
  { document_id: '2018:218', provision_ref: '3:2', chapter: '3', section: '2', title: 'Sanktionsavgifter', content: 'Integritetsskyddsmyndigheten får besluta om administrativa sanktionsavgifter enligt artiklarna 83 och 84 i EU:s dataskyddsförordning.' },
  { document_id: '2018:218', provision_ref: '4:1', chapter: '4', section: '1', title: 'Skadestånd', content: 'Den personuppgiftsansvarige eller personuppgiftsbiträdet ska ersätta den registrerade för den skada och kränkning av den personliga integriteten som en behandling i strid med denna lag har orsakat.' },
  { document_id: '1998:204', provision_ref: '1', chapter: null, section: '1', title: 'Lagens syfte', content: 'Syftet med denna lag är att skydda människor mot att deras personliga integritet kränks genom behandling av personuppgifter.' },
  { document_id: '1998:204', provision_ref: '3', chapter: null, section: '3', title: 'Definitioner', content: 'I denna lag används följande beteckningar med den betydelse som här anges: personuppgifter - all slags information som direkt eller indirekt kan hänföras till en fysisk person som är i livet.' },
  { document_id: '1998:204', provision_ref: '5 a', chapter: null, section: '5 a', title: 'Missbruksregeln', content: 'Behandling av personuppgifter som inte ingår i eller är avsedda att ingå i en samling av personuppgifter som har strukturerats för att påtagligt underlätta sökning efter eller sammanställning av personuppgifter är tillåten om behandlingen inte innebär en kränkning av den registrerades personliga integritet.' },
];

const SAMPLE_PROVISION_VERSIONS = [
  { document_id: '2018:218', provision_ref: '1:1', chapter: '1', section: '1', title: 'Lagens syfte', content: 'Denna lag kompletterar Europaparlamentets och rådets förordning (EU) 2016/679 av den 27 april 2016 om skydd för fysiska personer med avseende på behandling av personuppgifter och om det fria flödet av sådana uppgifter och om upphävande av direktiv 95/46/EG (allmän dataskyddsförordning).', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '1:2', chapter: '1', section: '2', title: 'Lagens tillämpningsområde', content: 'Denna lag gäller vid behandling av personuppgifter som helt eller delvis företas på automatisk väg och vid annan behandling av personuppgifter som ingår i eller kommer att ingå i ett register.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '1:3', chapter: '1', section: '3', title: null, content: 'Lagen gäller inte för behandling av personuppgifter som en fysisk person utför som ett led i verksamhet av rent privat natur.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '2:1', chapter: '2', section: '1', title: 'Rättslig grund för behandling av personuppgifter', content: 'Personuppgifter får behandlas med stöd av artikel 6.1 e i EU:s dataskyddsförordning, om behandlingen är nödvändig för att utföra en uppgift av allmänt intresse.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '2:2', chapter: '2', section: '2', title: 'Behandling som rör ett viktigt allmänt intresse', content: 'Personuppgifter som avses i artikel 9.1 i EU:s dataskyddsförordning (känsliga personuppgifter) får behandlas av en myndighet med stöd av artikel 9.2 g i förordningen under förutsättning att behandlingen är nödvändig med hänsyn till ett viktigt allmänt intresse.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '3:1', chapter: '3', section: '1', title: 'Tillsynsmyndighet', content: 'Datainspektionen är tillsynsmyndighet enligt EU:s dataskyddsförordning.', valid_from: '2018-05-25', valid_to: '2021-01-01' },
  { document_id: '2018:218', provision_ref: '3:1', chapter: '3', section: '1', title: 'Tillsynsmyndighet', content: 'Integritetsskyddsmyndigheten är tillsynsmyndighet enligt EU:s dataskyddsförordning.', valid_from: '2021-01-01', valid_to: null },
  { document_id: '2018:218', provision_ref: '3:2', chapter: '3', section: '2', title: 'Sanktionsavgifter', content: 'Integritetsskyddsmyndigheten får besluta om administrativa sanktionsavgifter enligt artiklarna 83 och 84 i EU:s dataskyddsförordning.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '2018:218', provision_ref: '4:1', chapter: '4', section: '1', title: 'Skadestånd', content: 'Den personuppgiftsansvarige eller personuppgiftsbiträdet ska ersätta den registrerade för den skada och kränkning av den personliga integriteten som en behandling i strid med denna lag har orsakat.', valid_from: '2018-05-25', valid_to: null },
  { document_id: '1998:204', provision_ref: '1', chapter: null, section: '1', title: 'Lagens syfte', content: 'Syftet med denna lag är att skydda människor mot att deras personliga integritet kränks genom behandling av personuppgifter.', valid_from: '1998-10-24', valid_to: '2018-05-25' },
  { document_id: '1998:204', provision_ref: '3', chapter: null, section: '3', title: 'Definitioner', content: 'I denna lag används följande beteckningar med den betydelse som här anges: personuppgifter - all slags information som direkt eller indirekt kan hänföras till en fysisk person som är i livet.', valid_from: '1998-10-24', valid_to: '2018-05-25' },
  { document_id: '1998:204', provision_ref: '5 a', chapter: null, section: '5 a', title: 'Missbruksregeln', content: 'Behandling av personuppgifter som inte ingår i eller är avsedda att ingå i en samling av personuppgifter som har strukturerats för att påtagligt underlätta sökning efter eller sammanställning av personuppgifter är tillåten om behandlingen inte innebär en kränkning av den registrerades personliga integritet.', valid_from: '1998-10-24', valid_to: '2018-05-25' },
];

const SAMPLE_CASE_LAW = [
  { document_id: 'NJA 2020', court: 'HD', case_number: 'T 1234-19', decision_date: '2020-03-15', summary: 'Högsta domstolen prövade frågan om skadestånd vid otillåten behandling av personuppgifter. Domstolen fann att den registrerade hade rätt till ersättning för den kränkning som behandlingen inneburit.', keywords: 'personuppgifter skadestånd kränkning dataskydd GDPR' },
  { document_id: 'HFD 2019', court: 'HFD', case_number: '5765-18', decision_date: '2019-06-20', summary: 'Högsta förvaltningsdomstolen fastställde Integritetsskyddsmyndighetens beslut om sanktionsavgift för bristfällig behandling av känsliga personuppgifter inom hälso- och sjukvården.', keywords: 'tillsyn sanktionsavgift känsliga personuppgifter hälso- och sjukvård' },
];

const SAMPLE_PREPARATORY_WORKS = [
  { statute_id: '2018:218', prep_document_id: '2017/18:105', title: 'Ny dataskyddslag', summary: 'Propositionen föreslår en ny lag med kompletterande bestämmelser till EU:s dataskyddsförordning. Lagen ersätter personuppgiftslagen (1998:204).' },
  { statute_id: '2018:218', prep_document_id: '2017:39', title: 'Ny dataskyddslag - SOU', summary: 'Utredningen föreslår kompletterande bestämmelser till EU:s dataskyddsförordning med fokus på anpassning av svensk rätt.' },
];

const SAMPLE_DEFINITIONS = [
  { document_id: '2018:218', term: 'personuppgift', term_en: 'personal data', definition: 'Varje upplysning som avser en identifierad eller identifierbar fysisk person.', source_provision: '1:1' },
  { document_id: '2018:218', term: 'behandling', term_en: 'processing', definition: 'En åtgärd eller kombination av åtgärder beträffande personuppgifter.', source_provision: '1:1' },
  { document_id: '2018:218', term: 'personuppgiftsansvarig', term_en: 'controller', definition: 'En fysisk eller juridisk person som bestämmer ändamålen och medlen för behandlingen av personuppgifter.', source_provision: '1:1' },
  { document_id: '2018:218', term: 'tillsynsmyndighet', term_en: 'supervisory authority', definition: 'Integritetsskyddsmyndigheten (IMY) är tillsynsmyndighet.', source_provision: '3:1' },
  { document_id: '1998:204', term: 'personuppgift', term_en: 'personal data', definition: 'All slags information som direkt eller indirekt kan hänföras till en fysisk person som är i livet.', source_provision: '3' },
];

const SAMPLE_CROSS_REFS = [
  { source_document_id: '2018:218', source_provision_ref: '1:1', target_document_id: '1998:204', target_provision_ref: null, ref_type: 'amended_by' },
  { source_document_id: '2018:218', source_provision_ref: '3:2', target_document_id: '2018:218', target_provision_ref: '3:1', ref_type: 'references' },
  { source_document_id: 'NJA 2020', source_provision_ref: null, target_document_id: '2018:218', target_provision_ref: '4:1', ref_type: 'references' },
];

export function createTestDatabase(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  insertSampleData(db);
  return db;
}

export function closeTestDatabase(db: Database.Database): void {
  if (db) db.close();
}

function insertSampleData(db: Database.Database): void {
  const insertDoc = db.prepare(`INSERT INTO legal_documents (id, type, title, title_en, short_name, status, issued_date, in_force_date, url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const doc of SAMPLE_DOCUMENTS) {
    insertDoc.run(doc.id, doc.type, doc.title, doc.title_en, doc.short_name, doc.status, doc.issued_date, doc.in_force_date, doc.url, doc.description);
  }

  const insertProv = db.prepare(`INSERT INTO legal_provisions (document_id, provision_ref, chapter, section, title, content) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const prov of SAMPLE_PROVISIONS) {
    insertProv.run(prov.document_id, prov.provision_ref, prov.chapter, prov.section, prov.title, prov.content);
  }

  const insertProvVersion = db.prepare(`
    INSERT INTO legal_provision_versions (
      document_id, provision_ref, chapter, section, title, content, valid_from, valid_to
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const version of SAMPLE_PROVISION_VERSIONS) {
    insertProvVersion.run(
      version.document_id,
      version.provision_ref,
      version.chapter,
      version.section,
      version.title,
      version.content,
      version.valid_from,
      version.valid_to
    );
  }

  const insertCL = db.prepare(`INSERT INTO case_law (document_id, court, case_number, decision_date, summary, keywords) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const cl of SAMPLE_CASE_LAW) {
    insertCL.run(cl.document_id, cl.court, cl.case_number, cl.decision_date, cl.summary, cl.keywords);
  }

  const insertPW = db.prepare(`INSERT INTO preparatory_works (statute_id, prep_document_id, title, summary) VALUES (?, ?, ?, ?)`);
  for (const pw of SAMPLE_PREPARATORY_WORKS) {
    insertPW.run(pw.statute_id, pw.prep_document_id, pw.title, pw.summary);
  }

  const insertDef = db.prepare(`INSERT INTO definitions (document_id, term, term_en, definition, source_provision) VALUES (?, ?, ?, ?, ?)`);
  for (const def of SAMPLE_DEFINITIONS) {
    insertDef.run(def.document_id, def.term, def.term_en, def.definition, def.source_provision);
  }

  const insertXRef = db.prepare(`INSERT INTO cross_references (source_document_id, source_provision_ref, target_document_id, target_provision_ref, ref_type) VALUES (?, ?, ?, ?, ?)`);
  for (const xref of SAMPLE_CROSS_REFS) {
    insertXRef.run(xref.source_document_id, xref.source_provision_ref, xref.target_document_id, xref.target_provision_ref, xref.ref_type);
  }
}

export const sampleData = {
  documents: SAMPLE_DOCUMENTS,
  provisions: SAMPLE_PROVISIONS,
  provisionVersions: SAMPLE_PROVISION_VERSIONS,
  caseLaw: SAMPLE_CASE_LAW,
  preparatoryWorks: SAMPLE_PREPARATORY_WORKS,
  definitions: SAMPLE_DEFINITIONS,
  crossRefs: SAMPLE_CROSS_REFS,
};
