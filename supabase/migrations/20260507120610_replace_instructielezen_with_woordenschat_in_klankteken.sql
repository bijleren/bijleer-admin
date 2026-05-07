/*
  # Replace domain in klankteken table

  ## Summary
  Replaces all occurrences of 'www.instructielezen.be' with 'www.woordenschat.be'
  across every text/URL column in the klankteken table. Only the domain part is
  replaced; all surrounding content (paths, query strings, etc.) is preserved.

  ## Columns updated
  - audio
  - audio_uitleg
  - tool_uitleg
  - tool
  - "imageTool"
  - "imageWord"
  - produce_audio
*/

UPDATE klankteken
SET
  audio         = REPLACE(audio,         'www.instructielezen.be', 'www.woordenschat.be'),
  audio_uitleg  = REPLACE(audio_uitleg,  'www.instructielezen.be', 'www.woordenschat.be'),
  tool_uitleg   = REPLACE(tool_uitleg,   'www.instructielezen.be', 'www.woordenschat.be'),
  tool          = REPLACE(tool,          'www.instructielezen.be', 'www.woordenschat.be'),
  "imageTool"   = REPLACE("imageTool",   'www.instructielezen.be', 'www.woordenschat.be'),
  "imageWord"   = REPLACE("imageWord",   'www.instructielezen.be', 'www.woordenschat.be'),
  produce_audio = REPLACE(produce_audio, 'www.instructielezen.be', 'www.woordenschat.be')
WHERE
  audio         LIKE '%instructielezen.be%' OR
  audio_uitleg  LIKE '%instructielezen.be%' OR
  tool_uitleg   LIKE '%instructielezen.be%' OR
  tool          LIKE '%instructielezen.be%' OR
  "imageTool"   LIKE '%instructielezen.be%' OR
  "imageWord"   LIKE '%instructielezen.be%' OR
  produce_audio LIKE '%instructielezen.be%';
