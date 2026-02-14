import type Database from '@ansvar/mcp-sqlite';

export interface AboutContext {
  version: string;
  fingerprint: string;
  dbBuilt: string;
}

export interface AboutResult {
  server: {
    name: string;
    package: string;
    version: string;
    suite: string;
    repository: string;
  };
  dataset: {
    fingerprint: string;
    built: string;
    jurisdiction: string;
    content_basis: string;
    counts: Record<string, number>;
    freshness: {
      last_checked: string | null;
      check_method: string;
    };
  };
  provenance: {
    sources: string[];
    license: string;
    authenticity_note: string;
  };
  security: {
    access_model: string;
    network_access: boolean;
    filesystem_access: boolean;
    arbitrary_execution: boolean;
  };
}

function safeCount(db: InstanceType<typeof Database>, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  } catch {
    return 0;
  }
}

export function getAbout(
  db: InstanceType<typeof Database>,
  context: AboutContext
): AboutResult {
  const counts: Record<string, number> = {
    legal_documents: safeCount(db, 'SELECT COUNT(*) as count FROM legal_documents'),
    legal_provisions: safeCount(db, 'SELECT COUNT(*) as count FROM legal_provisions'),
    case_law: safeCount(db, 'SELECT COUNT(*) as count FROM case_law'),
    preparatory_works: safeCount(db, 'SELECT COUNT(*) as count FROM preparatory_works'),
    definitions: safeCount(db, 'SELECT COUNT(*) as count FROM definitions'),
    eu_documents: safeCount(db, 'SELECT COUNT(*) as count FROM eu_documents'),
    eu_references: safeCount(db, 'SELECT COUNT(*) as count FROM eu_references'),
    cross_references: safeCount(db, 'SELECT COUNT(*) as count FROM cross_references'),
  };

  return {
    server: {
      name: 'Swedish Law MCP',
      package: '@ansvar/swedish-law-mcp',
      version: context.version,
      suite: 'Ansvar Compliance Suite',
      repository: 'https://github.com/Ansvar-Systems/Swedish-Law-MCP',
    },
    dataset: {
      fingerprint: context.fingerprint,
      built: context.dbBuilt,
      jurisdiction: 'Sweden (SE)',
      content_basis:
        'Swedish statute text from riksdagen.se and lagen.nu. Case law from lagen.nu ' +
        '(CC-BY Domstolsverket). Not an official legal publication.',
      counts,
      freshness: {
        last_checked: null,
        check_method: 'Manual review',
      },
    },
    provenance: {
      sources: [
        'riksdagen.se (statutes)',
        'lagen.nu (case law, CC-BY)',
        'EUR-Lex (EU directive references)',
      ],
      license:
        'Apache-2.0 (server code). Swedish law is not subject to copyright ' +
        'per 1 \u00a7 upphovsr\u00e4ttslagen (1960:729). Case law data licensed CC-BY from lagen.nu.',
      authenticity_note:
        'Statute text is derived from riksdagen.se and lagen.nu. Case law from lagen.nu. ' +
        'Verify against official publications (Svensk F\u00f6rfattningssamling).',
    },
    security: {
      access_model: 'read-only',
      network_access: false,
      filesystem_access: false,
      arbitrary_execution: false,
    },
  };
}
