-- Add 16 missing films from IMDb Top 250
-- Generated: 2026-01-07T05:35:29.903Z

INSERT INTO movies (tmdb_id, title, release_year) VALUES
  (1163258, '12th Fail', null),
  (103663, 'Jagten', null),
  (7508, 'Taare Zameen Par', null),
  (832, 'M - Eine Stadt sucht einen Mörder', null),
  (60243, 'Jodaeiye Nader az Simin', null),
  (360814, 'Dangal', null),
  (31534, 'Hababam Sinifi: Sinifta Kaldi', null),
  (11659, 'La meglio gioventù', null),
  (1118224, 'Maharaja', null),
  (406, 'La haine', null),
  (378064, 'Koe no katachi', null),
  (13393, 'Babam ve Oglum', null),
  (117691, 'Gangs of Wasseypur', null),
  (352173, 'Drishyam', null),
  (635302, 'Gekijô-ban Kimetsu no Yaiba Mugen Ressha-hen', null),
  (534780, 'Andhadhun', null)
ON CONFLICT (tmdb_id) DO NOTHING;
