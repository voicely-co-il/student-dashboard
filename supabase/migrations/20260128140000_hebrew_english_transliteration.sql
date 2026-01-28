-- Hebrew-English Name Transliteration System
-- מערכת תעתיק שמות עברית-אנגלית

-- Step 1: Create transliteration lookup table
CREATE TABLE IF NOT EXISTS public.name_transliterations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hebrew_name TEXT NOT NULL,
  english_variants TEXT[] NOT NULL,  -- Array of possible English spellings
  is_first_name BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transliterations_hebrew ON public.name_transliterations(hebrew_name);
CREATE INDEX IF NOT EXISTS idx_transliterations_english ON public.name_transliterations USING GIN(english_variants);

-- Step 2: Populate with common Israeli names
INSERT INTO public.name_transliterations (hebrew_name, english_variants, is_first_name) VALUES
-- א
('אביב', ARRAY['aviv', 'avib'], true),
('אביגיל', ARRAY['avigail', 'avigayil', 'abigail'], true),
('אביטל', ARRAY['avital', 'abital'], true),
('אבירם', ARRAY['aviram', 'abiram'], true),
('אביתר', ARRAY['avitar', 'evyatar', 'eviatar'], true),
('אדם', ARRAY['adam'], true),
('אדר', ARRAY['adar'], true),
('אהרון', ARRAY['aharon', 'aaron', 'aron'], true),
('אודי', ARRAY['udi', 'udy', 'ody'], true),
('אופיר', ARRAY['ofir', 'ophir', 'ofer'], true),
('אופק', ARRAY['ofek', 'ophek'], true),
('אופרי', ARRAY['ofri', 'ophri', 'opry'], true),
('אור', ARRAY['or', 'ohr'], true),
('אורי', ARRAY['ori', 'ory', 'uri'], true),
('אוריה', ARRAY['oriya', 'uriah', 'uria', 'orya'], true),
('אורן', ARRAY['oren', 'oron'], true),
('אורית', ARRAY['orit', 'orrit'], true),
('אושר', ARRAY['osher', 'usher'], true),
('איילה', ARRAY['ayala', 'ayelet', 'ayla', 'ayla'], true),
('אילן', ARRAY['ilan', 'elan'], true),
('אילת', ARRAY['eilat', 'ilat', 'elat'], true),
('איתי', ARRAY['itay', 'itai', 'etay', 'etai'], true),
('איתמר', ARRAY['itamar', 'etamar'], true),
('אלון', ARRAY['alon', 'elon'], true),
('אלי', ARRAY['eli', 'ely'], true),
('אליה', ARRAY['eliya', 'eliyahu', 'elijah'], true),
('אלינור', ARRAY['elinor', 'eleanor', 'alinor'], true),
('אלירז', ARRAY['eliraz', 'elraz'], true),
('אלישבע', ARRAY['elisheva', 'elishba', 'alishba', 'elisheba'], true),
('אלישע', ARRAY['elisha'], true),
('אלעד', ARRAY['elad', 'elead'], true),
('אלרואי', ARRAY['elroey', 'elroy', 'elroi'], true),
('אמיר', ARRAY['amir', 'ameer'], true),
('אמית', ARRAY['amit'], true),
('אנבל', ARRAY['anabel', 'anbal', 'inbal', 'anabell'], true),
('ענבל', ARRAY['inbal', 'anabel', 'anbal', 'anabell'], true),
('אפרת', ARRAY['efrat', 'ephrat'], true),
('אריאל', ARRAY['ariel', 'ariell', 'ariela'], true),
('אריה', ARRAY['arie', 'aryeh', 'arye', 'aria'], true),
('ארנון', ARRAY['arnon'], true),
('אשר', ARRAY['asher'], true),

-- ב
('בועז', ARRAY['boaz', 'booz'], true),
('בן', ARRAY['ben'], true),
('ברק', ARRAY['barak', 'baraq'], true),

-- ג
('גד', ARRAY['gad'], true),
('גיא', ARRAY['guy', 'gai', 'gye'], true),
('גיל', ARRAY['gil', 'gill'], true),
('גילי', ARRAY['gili', 'gilly', 'gilee', 'gilit'], true),
('גל', ARRAY['gal', 'gall'], true),
('גליה', ARRAY['galya', 'galia', 'galiya'], true),

-- ד
('דביר', ARRAY['dvir', 'debir', 'devir'], true),
('דוד', ARRAY['david', 'daveed', 'daved'], true),
('דולב', ARRAY['dolev'], true),
('דן', ARRAY['dan'], true),
('דנה', ARRAY['dana', 'danna'], true),
('דניאל', ARRAY['daniel', 'danielle', 'dani'], true),
('דפנה', ARRAY['daphna', 'dafna', 'daphne'], true),
('דרור', ARRAY['dror'], true),

-- ה
('הדס', ARRAY['hadas', 'hadass'], true),
('הדר', ARRAY['hadar', 'haddar'], true),
('הילה', ARRAY['hila', 'hilla'], true),
('הלל', ARRAY['hillel', 'hilel', 'hallel'], true),

-- ו
('ורד', ARRAY['vered', 'vared'], true),

-- ז
('זיו', ARRAY['ziv', 'zeev'], true),
('זכי', ARRAY['zaki', 'zacky', 'zachi'], true),

-- ח
('חגי', ARRAY['hagai', 'chagai'], true),
('חיים', ARRAY['haim', 'chaim', 'hayim'], true),
('חן', ARRAY['chen', 'hen'], true),
('חנה', ARRAY['hana', 'hannah', 'chana'], true),
('חנן', ARRAY['hanan', 'chanan'], true),
('חננאל', ARRAY['hananel', 'chananel'], true),

-- ט
('טל', ARRAY['tal', 'tall'], true),
('טליה', ARRAY['talia', 'talya', 'tally'], true),
('טובי', ARRAY['toby', 'tobey', 'tovi'], true),

-- י
('יאיר', ARRAY['yair', 'jair'], true),
('יגאל', ARRAY['yigal', 'igal', 'yegal'], true),
('יהונתן', ARRAY['yonatan', 'jonathan', 'yehonatan', 'jonatan'], true),
('יהושע', ARRAY['yehoshua', 'joshua', 'josh'], true),
('יהל', ARRAY['yahel', 'yaheli'], true),
('יואב', ARRAY['yoav', 'joav', 'yoab'], true),
('יובל', ARRAY['yuval', 'juval', 'uval'], true),
('יוחאי', ARRAY['yochai', 'yohay'], true),
('יונה', ARRAY['yona', 'jonah', 'yonah'], true),
('יונתן', ARRAY['yonatan', 'jonathan', 'jonatan'], true),
('יוסי', ARRAY['yossi', 'yosi', 'jossi'], true),
('יוסף', ARRAY['yosef', 'joseph', 'yossef'], true),
('יותם', ARRAY['yotam', 'jotham'], true),
('יעל', ARRAY['yael', 'jael', 'yale'], true),
('יעקב', ARRAY['yaakov', 'yakov', 'jacob', 'jakob'], true),
('ירדן', ARRAY['yarden', 'jordan'], true),
('ירון', ARRAY['yaron', 'jaron'], true),
('ישי', ARRAY['yishai', 'ishai', 'isay', 'isai', 'jesse'], true),
('ישראל', ARRAY['israel', 'yisrael', 'isreal'], true),
('יצחק', ARRAY['yitzhak', 'yitzchak', 'isaac', 'itzik'], true),

-- כ
('כפיר', ARRAY['kfir', 'kefir'], true),
('כרמי', ARRAY['carmi', 'karmi'], true),
('כרמל', ARRAY['carmel', 'karmel', 'carmela'], true),

-- ל
('לאה', ARRAY['leah', 'lea', 'lia'], true),
('ליאור', ARRAY['lior', 'leor'], true),
('ליאל', ARRAY['liel', 'liell'], true),
('ליאן', ARRAY['lian', 'lianne', 'leanne'], true),
('ליהי', ARRAY['lihi', 'lihie', 'leehe'], true),
('לימור', ARRAY['limor'], true),
('לין', ARRAY['lin', 'lynn', 'lyn'], true),
('לירז', ARRAY['liraz', 'lirazz'], true),
('לירון', ARRAY['liron', 'leeron'], true),

-- מ
('מאור', ARRAY['maor', 'meor'], true),
('מאיה', ARRAY['maya', 'maia', 'mya'], true),
('מיה', ARRAY['mia', 'miya', 'meya'], true),
('מיכאל', ARRAY['michael', 'mikael', 'mikhael', 'mihael'], true),
('מיכל', ARRAY['michal', 'meechal'], true),
('מיתר', ARRAY['meitar', 'meytar'], true),
('מעיין', ARRAY['maayan', 'mayan', 'maian'], true),
('מרים', ARRAY['miriam', 'miryam'], true),
('משה', ARRAY['moshe', 'moses', 'moше'], true),

-- נ
('נגה', ARRAY['noga', 'nogah'], true),
('נדב', ARRAY['nadav', 'nadab'], true),
('נוי', ARRAY['noy', 'noi'], true),
('נועה', ARRAY['noa', 'noah', 'noaa'], true),
('נועם', ARRAY['noam', 'noham'], true),
('נופר', ARRAY['nofar', 'nopher'], true),
('נטע', ARRAY['neta', 'netah'], true),
('נטלי', ARRAY['nataly', 'natalie', 'netali'], true),
('ניב', ARRAY['niv', 'neev'], true),
('ניצן', ARRAY['nitzan', 'nitzann'], true),
('ניר', ARRAY['nir', 'neer'], true),
('נמרוד', ARRAY['nimrod', 'nimrodd'], true),
('נעמה', ARRAY['naama', 'naomi', 'neama'], true),
('נתן', ARRAY['natan', 'nathan'], true),
('נתנאל', ARRAY['netanel', 'nathaniel', 'nathanel', 'nethanel'], true),

-- ס
('סער', ARRAY['saar', 'sahar'], true),
('סתיו', ARRAY['stav', 'stave'], true),

-- ע
('עדי', ARRAY['adi', 'addy', 'adee'], true),
('עדן', ARRAY['eden', 'aden'], true),
('עומר', ARRAY['omer', 'omar'], true),
('עופר', ARRAY['ofer', 'offer', 'opher'], true),
('עמית', ARRAY['amit', 'amith'], true),
('ענבר', ARRAY['inbar', 'anbar', 'enbar'], true),
('ערן', ARRAY['eran', 'erann'], true),

-- פ
('פלג', ARRAY['peleg', 'pelleg'], true),

-- צ
('צבי', ARRAY['zvi', 'tzvi', 'zevi'], true),
('צליל', ARRAY['zlil', 'tslil', 'zelil'], true),

-- ק
('קורל', ARRAY['coral', 'koral', 'korall'], true),

-- ר
('רביד', ARRAY['ravid', 'rabid'], true),
('רון', ARRAY['ron', 'ronn'], true),
('רוני', ARRAY['roni', 'ronny', 'ronni'], true),
('רותם', ARRAY['rotem', 'rothem'], true),
('רז', ARRAY['raz', 'razz'], true),
('ריבי', ARRAY['rivi', 'rivy'], true),

-- ש
('שגיא', ARRAY['sagi', 'sagy', 'saggie'], true),
('שובל', ARRAY['shuval', 'shoval', 'shuvali'], true),
('שון', ARRAY['shaun', 'shon', 'shawn'], true),
('שחר', ARRAY['shachar', 'shahar', 'sahar'], true),
('שי', ARRAY['shay', 'shai', 'shy'], true),
('שיר', ARRAY['shir', 'sheer'], true),
('שירה', ARRAY['shira', 'sheera'], true),
('שירז', ARRAY['shiraz', 'sheeraz'], true),
('שני', ARRAY['shani', 'shanni'], true),
('שקד', ARRAY['shaked', 'shakked'], true),
('שרה', ARRAY['sara', 'sarah', 'sahra'], true),
('שרון', ARRAY['sharon', 'sharron'], true),

-- ת
('תאיר', ARRAY['tair', 'tahir', 'thair'], true),
('תהילה', ARRAY['tehila', 'tehilla', 'tahila'], true),
('תום', ARRAY['tom', 'thom', 'tome'], true),
('תומר', ARRAY['tomer', 'thomer'], true),
('תמר', ARRAY['tamar', 'tamara', 'thamar'], true)

ON CONFLICT DO NOTHING;

-- Step 3: Create smart matching function
CREATE OR REPLACE FUNCTION public.smart_name_match(
  p_transcript_name TEXT,
  p_crm_names TEXT[]
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transcript_lower TEXT;
  v_transcript_first TEXT;
  v_crm_name TEXT;
  v_crm_lower TEXT;
  v_crm_first TEXT;
  v_best_match TEXT := NULL;
  v_best_score INTEGER := 0;
  v_score INTEGER;
  v_hebrew_name TEXT;
  v_english_variants TEXT[];
BEGIN
  v_transcript_lower := LOWER(TRIM(p_transcript_name));
  v_transcript_first := SPLIT_PART(v_transcript_lower, ' ', 1);

  FOREACH v_crm_name IN ARRAY p_crm_names LOOP
    v_crm_lower := LOWER(TRIM(v_crm_name));
    v_crm_first := SPLIT_PART(v_crm_lower, ' ', 1);
    v_score := 0;

    -- Exact match = 100
    IF v_transcript_lower = v_crm_lower THEN
      RETURN v_crm_name;
    END IF;

    -- First name exact match = 80
    IF v_transcript_first = v_crm_first THEN
      v_score := 80;
    -- Transcript is first name of CRM = 70
    ELSIF v_transcript_lower = v_crm_first THEN
      v_score := 70;
    -- CRM contains transcript = 50
    ELSIF v_crm_lower LIKE '%' || v_transcript_lower || '%' THEN
      v_score := 50;
    END IF;

    -- Check transliteration if no direct match
    IF v_score = 0 THEN
      -- Check if transcript (English) matches any Hebrew name's variants
      SELECT hebrew_name INTO v_hebrew_name
      FROM name_transliterations
      WHERE v_transcript_first = ANY(english_variants)
      LIMIT 1;

      IF v_hebrew_name IS NOT NULL THEN
        -- Check if CRM name starts with this Hebrew name
        IF v_crm_first LIKE v_hebrew_name || '%' OR v_crm_first = v_hebrew_name THEN
          v_score := 75;
        END IF;
      END IF;

      -- Check reverse: if CRM (Hebrew) has English variants matching transcript
      SELECT english_variants INTO v_english_variants
      FROM name_transliterations
      WHERE v_crm_first LIKE hebrew_name || '%' OR hebrew_name = v_crm_first
      LIMIT 1;

      IF v_english_variants IS NOT NULL AND v_transcript_first = ANY(v_english_variants) THEN
        v_score := 75;
      END IF;
    END IF;

    IF v_score > v_best_score THEN
      v_best_score := v_score;
      v_best_match := v_crm_name;
    END IF;
  END LOOP;

  -- Only return if score is above threshold
  IF v_best_score >= 50 THEN
    RETURN v_best_match;
  END IF;

  RETURN NULL;
END;
$$;

-- Step 4: Function to run smart matching on all pending
CREATE OR REPLACE FUNCTION public.auto_match_pending_names(p_crm_names TEXT[])
RETURNS TABLE (
  matched_count INTEGER,
  remaining_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched INTEGER := 0;
  v_record RECORD;
  v_match TEXT;
BEGIN
  FOR v_record IN
    SELECT id, original_name
    FROM student_name_mappings
    WHERE status = 'pending'
  LOOP
    v_match := smart_name_match(v_record.original_name, p_crm_names);

    IF v_match IS NOT NULL THEN
      UPDATE student_name_mappings
      SET
        crm_match = v_match,
        status = 'auto_matched',
        resolved_name = v_match
      WHERE id = v_record.id;

      v_matched := v_matched + 1;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT
    v_matched,
    (SELECT COUNT(*)::INTEGER FROM student_name_mappings WHERE status = 'pending');
END;
$$;

-- Grant permissions
GRANT SELECT ON public.name_transliterations TO authenticated;
GRANT EXECUTE ON FUNCTION public.smart_name_match TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_match_pending_names TO service_role;

COMMENT ON TABLE public.name_transliterations IS 'Hebrew to English name transliteration lookup';
COMMENT ON FUNCTION public.smart_name_match IS 'Smart matching of transcript name to CRM names with transliteration support';
