-- Entwurf v0.2, NOCH NICHT EINSPIELEN.
-- C&C²-Ansatz: Tabellen im Supabase-Projekt "Kompendium", ausschließlich Präfix cc_ (konzept_v1, S1).
-- Abbildung 1:1 auf src/core/types.ts (Schema 1). Geometrie und Listen als jsonb.

create table if not exists cc_projekte (
  id uuid primary key,
  titel text not null,
  zweck text not null default '',
  art text not null check (art in ('analyse','neuentwicklung','fehleranalyse')),
  vorgehen text not null default 'klassisch' check (vorgehen in ('klassisch','extended')),
  erstellt timestamptz not null default now(),
  geaendert timestamptz not null default now()
);

create table if not exists cc_bilder (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  name text not null default '',
  art text not null default 'foto',
  breite integer not null check (breite > 0),
  hoehe integer not null check (hoehe > 0),
  quelle text not null default '',
  pfad text not null -- Objektpfad im Bucket cc-bilder
);

create table if not exists cc_modelle (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  titel text not null,
  zweck text not null default '',
  bild_id uuid references cc_bilder(id) on delete set null,
  ausschnitt jsonb,
  parent_modell_id uuid references cc_modelle(id) on delete cascade,
  parent_element_id uuid,
  praefix text not null default '',
  detailstufe integer not null default 0,
  ort text not null default '',
  logischer_zustand text not null default '',
  zustand_ids uuid[] not null default '{}',
  grenze jsonb,
  notiz text not null default ''
);

create table if not exists cc_teile (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  name text not null,
  parent_id uuid references cc_teile(id) on delete cascade,
  medium text not null default 'fest',
  notiz text not null default ''
);

create table if not exists cc_elemente (
  id uuid primary key,
  modell_id uuid not null references cc_modelle(id) on delete cascade,
  typ text not null check (typ in ('WFP','LSS','C','FA','KNOTEN','BF','RS')),
  nr text not null default '',
  name text not null default '',
  geometrie jsonb not null default '[]',
  breite real not null default 0,
  medium text not null default 'fest',
  teil_id uuid references cc_teile(id) on delete set null,
  zustand_ids uuid[] not null default '{}',
  wfp_a uuid references cc_elemente(id) on delete set null,
  wfp_b uuid references cc_elemente(id) on delete set null,
  wfp_id uuid references cc_elemente(id) on delete set null,
  quelle boolean not null default false,
  lss_id uuid references cc_elemente(id) on delete set null,
  bezug_element_id uuid,
  funktion text not null default '',
  anmerkung text not null default '',
  konfidenz text not null default 'wahrscheinlich',
  check (typ <> 'LSS' or wfp_a is null or wfp_a <> wfp_b)
);

create table if not exists cc_funktionen (
  id uuid primary key,
  modell_id uuid not null references cc_modelle(id) on delete cascade,
  text text not null default '',
  element_ids uuid[] not null default '{}'
);

create table if not exists cc_zustaende (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  name text not null,
  art text not null default 'zeitlich',
  reihenfolge integer not null,
  trigger text not null default '',
  beschreibung text not null default ''
);

create table if not exists cc_parameter (
  id uuid primary key,
  element_id uuid not null references cc_elemente(id) on delete cascade,
  name text not null default '',
  wert double precision,
  einheit text not null default '',
  art text not null default 'angenommen',
  quelle text not null default ''
);

create table if not exists cc_hypothesen (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  titel text not null default '', wenn text not null default '', referenz text not null default '',
  dann text not null default '', weil text not null default '', pruefung text not null default '',
  ergebnis text not null default '',
  status text not null default 'offen',
  konfidenz text not null default 'vermutet',
  element_ids uuid[] not null default '{}'
);

create table if not exists cc_entscheidungen (
  id uuid primary key,
  projekt_id uuid not null references cc_projekte(id) on delete cascade,
  titel text not null default '', kontext text not null default '',
  operation text not null default 'aendern',
  element_ids uuid[] not null default '{}',
  alternativen text not null default '', begruendung text not null default '',
  hypothese_ids uuid[] not null default '{}',
  status text not null default 'vorgeschlagen',
  ersetzt_durch uuid references cc_entscheidungen(id) on delete set null,
  konfidenz text not null default 'wahrscheinlich',
  datum date not null default current_date,
  autor text not null default ''
);

-- Bucket (über Dashboard oder storage-API anlegen): cc-bilder, privat.
-- RLS: vor dem Einspielen mit den übrigen Kompendium-Tabellen abstimmen.
