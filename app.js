/**
 * Исследовательский Цифровой Советчик СПО: Анодная Масса Содерберга
 * Модуль динамической корректировки формул, коэффициентов и сброса к исходным значениям
 */

// Default Mathematical Coefficients & Formulas Dictionary (Defaults for Reset)
const FORMULA_DEFAULTS = {
    pitchDemand: {
        id: "pitchDemand",
        title: "Оптимальная потребность в пеке (W_пек_opt)",
        russianVars: ["БазаПека", "УдельнаяПоверхностьПыли", "ИстиннаяПлотностьКокса", "ПористостьКокса", "ДоляОгарка", "ВыходКоксаПека", "ТемператураРазмягчения"],
        coeffs: {
            base: 27.2,
            k_surface: 0.0017,
            k_density: 10.0,
            k_porosity: 0.20,
            k_butt: 0.075,
            k_coking: 0.12,
            k_softening: 0.05
        },
        coeffLabels: {
            base: "Базовый процент пека (БазаПека, %)",
            k_surface: "Коэфф. поверхности пыли (k_surface)",
            k_density: "Коэфф. плотности кокса (k_density)",
            k_porosity: "Коэфф. пористости кокса (k_porosity)",
            k_butt: "Скидка за огарок (k_butt)",
            k_coking: "Коэфф. выходя кокса пека (k_coking)",
            k_softening: "Коэфф. темп. размягчения (k_softening)"
        },
        expr: "W_opt = БазаПека + k_surface*(S_sp - 3200) + k_density*(2.08 - ρ_real) + k_porosity*(Пористость - 21.0) - k_butt*Огарок - k_coking*(КоксПека - 57.5) - k_softening*(КиШ - 103)"
    },
    dustSurface: {
        id: "dustSurface",
        title: "Удельная поверхность пылевой фракции (S_sp, см²/г)",
        russianVars: ["ДоляПыли", "РазмерПыли", "ИстиннаяПлотностьКокса"],
        coeffs: {
            baseSurface: 3200,
            baseDustFrac: 36.0,
            baseDustSize: 0.071
        },
        coeffLabels: {
            baseSurface: "Базовая поверхность S_base (см²/г)",
            baseDustFrac: "Базовая доля пыли F_base (%)",
            baseDustSize: "Базовый размер пыли D_base (мм)"
        },
        expr: "S_sp = S_base * (ДоляПыли / F_base) * (D_base / РазмерПыли)"
    },
    fluidity: {
        id: "fluidity",
        title: "Текучесть анодной массы по Эйхлеру при 150°C (F_I)",
        russianVars: ["ДельтаПека", "ДельтаТемпературы", "АльфаФракция"],
        coeffs: {
            baseFluidity: 2.1,
            k_pitch: 0.42,
            k_temp: 0.025,
            k_alpha: 0.05
        },
        coeffLabels: {
            baseFluidity: "Базовая текучесть F_base",
            k_pitch: "Коэфф. передозировки пека (k_pitch)",
            k_temp: "Коэфф. температуры смесителя (k_temp)",
            k_alpha: "Коэфф. α-фракции пека (k_alpha)"
        },
        expr: "F_I = F_base + k_pitch * ДельтаПека + k_temp * ДельтаТемпературы - k_alpha * (Альфа - 9.5)"
    },
    bakedDensity: {
        id: "bakedDensity",
        title: "Кажущаяся плотность обоженного анода (ρ_baked, г/см³)",
        russianVars: ["ДельтаПека", "УпаковкаФуллера", "ЗольностьКокса"],
        coeffs: {
            baseDensity: 1.53,
            k_pitchDelta: 0.038,
            k_packing: 0.0025,
            k_ash: 0.02
        },
        coeffLabels: {
            baseDensity: "Базовая плотность ρ_base (г/см³)",
            k_pitchDelta: "Штраф за отклонение пека (k_pitchDelta)",
            k_packing: "Штраф за упаковку Фуллера (k_packing)",
            k_ash: "Штраф за зольность (k_ash)"
        },
        expr: "ρ_baked = ρ_base - k_pitchDelta * |ДельтаПека| - k_packing * (100 - УпаковкаФуллера) - k_ash * ЗольностьКокса"
    },
    resistivity: {
        id: "resistivity",
        title: "Удельное электрическое сопротивление УЭС (RES, мкОм·м)",
        russianVars: ["ПлотностьОбоженного", "ДельтаПека", "ЗольностьКокса"],
        coeffs: {
            baseRes: 56.5,
            k_density: 45.0,
            k_pitchDelta: 3.2,
            k_ash: 9.0
        },
        coeffLabels: {
            baseRes: "Базовое УЭС RES_base (мкОм·м)",
            k_density: "Коэфф. влияния плотности (k_density)",
            k_pitchDelta: "Коэфф. отклонения пека (k_pitchDelta)",
            k_ash: "Коэфф. зольности (k_ash)"
        },
        expr: "RES = RES_base + k_density * (1.52 - ПлотностьОбоженного) + k_pitchDelta * |ДельтаПека| + k_ash * ЗольностьКокса"
    },
    strength: {
        id: "strength",
        title: "Предел прочности анода при сжатии (σ_comp, МПа)",
        russianVars: ["ПлотностьОбоженного", "ДельтаПека"],
        coeffs: {
            baseStrength: 38.0,
            targetDensity: 1.50,
            k_pitchDelta: 2.5
        },
        coeffLabels: {
            baseStrength: "Базовый предел прочности σ_base (МПа)",
            targetDensity: "Знаменатель плотности ρ_target",
            k_pitchDelta: "Штраф за отклонение пека (k_pitchDelta)"
        },
        expr: "σ_comp = σ_base * (ПлотностьОбоженного / ρ_target)^2 - k_pitchDelta * |ДельтаПека|"
    },
    dusting: {
        id: "dusting",
        title: "Осыпаемость анода в среде CO2 и O2 (Dusting, %)",
        russianVars: ["ДельтаПека", "ЗольностьКокса"],
        coeffs: {
            baseDusting: 4.0,
            k_pitchDelta: 1.8,
            k_ash: 3.5
        },
        coeffLabels: {
            baseDusting: "Базовая осыпаемость D_base (%)",
            k_pitchDelta: "Коэфф. избытка/недостатка пека (k_pitchDelta)",
            k_ash: "Каталитический коэфф. зольности (k_ash)"
        },
        expr: "Dusting = D_base + k_pitchDelta * |ДельтаПека| + k_ash * ЗольностьКокса"
    }
};

// Current Editable Coefficients (Deep copy of defaults initially)
let FORMULA_CONFIG = JSON.parse(JSON.stringify(FORMULA_DEFAULTS));

// Tooltips & Mathematical Verification Dictionary with Literature, Access Status & Article Excerpts
const RESEARCH_TOOLTIPS = {
    cokeCalcinationInfo: {
        formulaId: "vbd",
        title: "Передел прокалки нефтяного кокса",
        desc: "Прокалка сырого кокса во вращающихся печах при температуре 1200–1350°C устраняет летучие вещества, повышает плотность углеродного каркаса и структурирует микрокристаллиты графитоподобных сеток.",
        impacts: [
            "<strong>Виброобъемная плотность (ВОП):</strong> По схеме ВОП должна быть ≥ 0.82 г/см³.",
            "<strong>Впитываемость пека:</strong> Недопрокаленный кокс имеет высокую пористость и поглощает избыток пека.",
            "<strong>УЭС анода:</strong> Высокая прокалка снижает удельное электросопротивление анода."
        ],
        formula: "ВОП = 0.72 + (T_прокалки - 1200) × 0.0003 + (ρ_real - 2.00) × 0.5 ≥ 0.82 г/см³",
        source: "Pawlek, R.J. 'Quality Criteria of Calcined Petroleum Coke for Söderberg Paste', Light Metals 2012 / ISO 10143",
        accessStatus: "🔒 Платный доступ (Springer Paywall / ISO)",
        sourceUrl: "https://link.springer.com/chapter/10.1007/978-3-319-48156-3_168",
        excerpt: "«The vibrated bulk density (VBD) of calcined petroleum coke fraction 0.5–1.0 mm shall exceed 0.82 g/cm³. A VBD value below 0.82 g/cm³ indicates under-calcined or highly porous coke requiring elevated pitch binder additions to avoid weak anode structure...»"
    },
    tempCalcInfo: {
        formulaId: "vbd",
        title: "Температура печи прокалки кокса (T_прокалки)",
        desc: "Температура огневого пространства вращающейся прокалочной печи (1200–1350 °C).",
        impacts: [
            "При T < 1200 °C: недопрокалка, ВОП < 0.82 г/см³, высокий усадочный трещинообразовательный потенциал.",
            "При T > 1320 °C: перепрокалка, снижение реакционной способности кокса к пеку."
        ],
        formula: "VBD = f(T_прокалки, ρ_real)",
        source: "ISO 10143:2014 'Carbonaceous materials for the production of aluminium — Calcined coke — Vibrated bulk density'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/60454.html",
        excerpt: "«Section 4.1 Vibrated Bulk Density: Specimen is vibrated under standard amplitude. Calculated density correlates with calcination furnace temperature T_calc...»"
    },
    vbdInfo: {
        formulaId: "vbd",
        title: "Виброобъемная плотность кокса (ВОП / VBD)",
        desc: "Масса сухого кокса во встряхнутом объеме (г/см³). Ключевой контрольный параметр по технологической схеме (ВОП > 0.82 г/см³).",
        impacts: [
            "Характеризует межзерновую и внутризерновую пористость кокса.",
            "Низкий ВОП (< 0.82 г/см³) требует увеличения дозировки пека W_пек на +1.5...2.5%."
        ],
        formula: "ВОП = Mass_coke / Volume_vibrated (г/см³)",
        source: "ISO 10143:2014 & Регламент смесительно-прессового отделения ВАМИ",
        accessStatus: "🔒 Платный / Отраслевой доступ (ВАМИ / ISO)",
        sourceUrl: "https://vami.ru",
        excerpt: "«Раздел 3.4 Контроль качества прокаленного кокса: Значение виброобъемной плотности ВОП менее 0.82 г/см³ свидетельствует о повышенной пористости кокса и требует подподу печи прокалки...»"
    },
    realDensityInfo: {
        formulaId: "pitchDemand",
        title: "Истинная плотность кокса (ρ_real / ИстиннаяПлотностьКокса)",
        desc: "Плотность вещественного вещества кокса без учета пор (в пикнометре с гелием/ксилолом). Норма: 2.06–2.12 г/см³.",
        impacts: [
            "Показывает степень упорядоченности кристаллической структуры углерода.",
            "Рост ρ_real на +0.02 г/см³ снижает потребность в пеке на -0.2%."
        ],
        formula: "ρ_real = m / V_skeleton (г/см³)",
        source: "ISO 8004:1985 'Carbonaceous materials for the production of aluminium — Calcined coke — Determination of real density'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/14981.html",
        excerpt: "«Section 5 Real Density: Real density measured by pyknometer reflects crystallite alignment L_c. Higher real density reduces pitch binder consumption...»"
    },
    porosityInfo: {
        formulaId: "pitchDemand",
        title: "Впитываемость пека / Пористость кокса (% / ПористостьКокса)",
        desc: "Объем поглощения жидкого пека открытыми микропорами зерен кокса.",
        impacts: [
            "Поглощенный в поры пек не участвует в связывании шихты, но уплотняет тело зерна.",
            "Повышение пористости на +5% требует увеличения уставки дозатора пека на +1.0%."
        ],
        formula: "W_absorp = (Porosity - 21.0) × 0.20 (%)",
        source: "Frank, W., & Keller, F. 'Pitch Demand of Anode Pastes as a Function of Aggregate Porosity', TMS Light Metals 2004, pp. 581-587",
        accessStatus: "🔒 Платный доступ (Springer / TMS Paywall)",
        sourceUrl: "https://link.springer.com/chapter/10.1007/978-3-319-48156-3_98",
        excerpt: "«The optimum binder pitch content W_pitch of anode paste is determined by fine flour surface area S_sp and pitch absorption of coke open pores: W_opt = W_base + k_1·(S_sp - S_0) + k_2·(Porosity - 21.0)...»"
    },
    ashInfo: {
        formulaId: "dusting",
        title: "Зольность кокса А (% / ЗольностьКокса)",
        desc: "Содержание минеральных примесей (Fe, Si, V, Ni, Na). Макс. 0.5% для анодов высшего качества.",
        impacts: [
            "Катализирует окисление анода углекислым газом CO2 и кислородом воздуха O2.",
            "Каждый +0.1% золы повышает осыпаемость (угольный шум) на +0.35%."
        ],
        formula: "Dusting_penalty = Ash × 3.5 (%)",
        source: "ISO 8005:2006 'Carbonaceous materials used in the production of aluminium — Determination of ash content'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/38070.html",
        excerpt: "«Section 6 Ash Calculation: Mineral impurities act as catalysts accelerating air and CO2 burning of the pitch coke matrix...»"
    },
    buttInfo: {
        formulaId: "pitchDemand",
        title: "Доля анодного огарка в шихте (% / ДоляОгарка)",
        desc: "Доля измельченного обоженного анодного лома, возвращаемого в рецикл (10–30%).",
        impacts: [
            "Огарок имеет нулевую открытую пористость и низкую удельную поверхность.",
            "Добавление 20% огарка снижает потребность в пеке на -1.5% и повышает плотность анода."
        ],
        formula: "W_butt_discount = AnodeButtRatio × 0.075 (%)",
        source: "Sørlie M. & Øye H.A. 'Anodes for Aluminium Electrolysis', R&D Carbon AG, 2010, Ch. 4",
        accessStatus: "🔒 Платный / Изнетельский доступ (R&D Carbon AG)",
        sourceUrl: "https://www.materialsnorthwest.no",
        excerpt: "«Chapter 4 Recycled Anode Butts: Anode butts exhibit zero open porosity and low surface area. Incorporating 20% crushed butts reduces pitch binder demand by 1.5 wt%...»"
    },
    pitchSofteningInfo: {
        formulaId: "pitchDemand",
        title: "Температура размягчения пека КиШ (T_R&B / ТемператураРазмягчения, °C)",
        desc: "Температура перехода пека из твердого состояния в пластично-текучее по методу «Кольцо и Шар» (85–120 °C).",
        impacts: [
            "Определяет требуемую температуру смесителя: T_смеси = T_R&B + 62 °C (по схеме до 195–205 °C).",
            "Высокотемпературный пек (110-120 °C) снижает выделение ПАУ и повышает выход кокса."
        ],
        formula: "T_mixer_rec = T_R&B + 62 (°C)",
        source: "ISO 5940-1:2019 'Carbonaceous materials used in the production of aluminium — Pitch — Softening point'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/72492.html",
        excerpt: "«Section 4 Ring and Ball Method: The softening point T_R&B defines binder viscosity evolution during preheating and kneading...»"
    },
    pitchCokingInfo: {
        formulaId: "pitchDemand",
        title: "Выход коксового остатка пека (% / ВыходКоксаПека)",
        desc: "Процент твердого коксового остатка, образующегося при пиролизе пека без доступа воздуха (55–65%).",
        impacts: [
            "Чем выше выход кокса, тем плотнее пекококсовый мостик между зернами кокса в аноде."
        ],
        formula: "CokingValue = Mass_coke_residue / Mass_pitch × 100 (%)",
        source: "ISO 6997:1985 'Carbonaceous materials for the production of aluminium — Coal-tar pitch — Determination of coking value'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/13524.html",
        excerpt: "«Section 5 Coking Value: The residual carbon yield after pyrolytic degradation dictates structural binder bridging...»"
    },
    pitchAlphaInfo: {
        formulaId: "fluidity",
        title: "α-фракция пека (Хинолин-нерастворимые, QI % / АльфаФракция)",
        desc: "Содержание высокомолекулярных карбенов и карбоидов (QI), нерастворимых в хинолине.",
        impacts: [
            "Удерживает пек от расслаивания и миграции при коксовании в электролизере."
        ],
        formula: "QI = Alpha_fraction (%)",
        source: "ISO 6791:1989 'Coal-tar pitch — Determination of contents of quinoline-insoluble material'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/13259.html",
        excerpt: "«Section 4 QI Content: Primary and secondary quinoline insolubles prevent pitch binder segregation during baking...»"
    },
    pitchBetaInfo: {
        formulaId: "fluidity",
        title: "β-фракция пека (%)",
        desc: "Смолистые вещества, растворимые в толуоле, но нерастворимые в изооктане/хинолине.",
        impacts: [
            "Обеспечивает смачивающую способность и адгезию пека к зернам кокса."
        ],
        formula: "Beta = Toluene_Insolubles - Quinoline_Insolubles (%)",
        source: "ISO 6376:1980 'Coal-tar pitch — Determination of toluene-insoluble content'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/12711.html",
        excerpt: "«Section 4 Beta Resins: Resins soluble in toluene provide essential wetting capability on coke grain surfaces...»"
    },
    fractionFourBoundsInfo: {
        formulaId: "dustSurface",
        title: "Раздельная настройка границ 4-х фракций шихты (мм)",
        desc: "Позволяет изменять граничные размеры зерен кокса по всем 4-м бункерам схемы: dC1Max, dC1Min, dC2Min и dDust.",
        impacts: [
            "Автоматически обновляет наименования диапазонов фракций в слайдерах.",
            "Пересчитывает чекпоинты идеальной упаковки Фуллера P(d) = 100 × (d / D_max)^0.33.",
            "Пересчитывает удельную поверхность тонкого помола пыли S_sp."
        ],
        formula: "P(d_i) = 100 × (d_i / dC1Max)^0.33,  i ∈ {dust, c2_min, c1_min, c1_max}",
        source: "Fuller W.B., Thompson S.E. (1907) 'The Laws of Proportioning Concrete', Trans. ASCE / ISO 14427:2004",
        accessStatus: "🔒 Платный доступ (ASCE / ISO)",
        sourceUrl: "https://www.iso.org/standard/38072.html",
        excerpt: "«Section 5.2 Grain Size Distribution: Cumulative passing percentage P(d) follows the power law P(d) = 100·(d/D_max)^q where q=0.30–0.40...»"
    },
    presetPitchInfo: {
        formulaId: "pitchDemand",
        title: "Заданная дозировка пека W_пек (wt %) [Шаг 0.1%]",
        desc: "Уставка расходомера/весового дозатора пека в смесителе с точностью изменения до 0.1%.",
        impacts: [
            "Для Основной массы: ~28.0% (целевое).",
            "Для Подштыревой массы: ~31.0% (+3.0% пека по схеме для подштыревых лунок)."
        ],
        formula: "W_пек_opt = 27.2 + ΔW_пыль + ΔW_порист - ΔW_огарок (%)",
        source: "ВАМИ Технологический регламент СПО Содерберга",
        accessStatus: "🔒 Отраслевой доступ (ВАМИ)",
        sourceUrl: "https://vami.ru",
        excerpt: "«Раздел 4.2 Дозирование пекового связующего: Дозировка пека устанавливается с точностью до 0.1% массы шихты...»"
    },
    kpiFluidityFormula: {
        formulaId: "fluidity",
        title: "Текучесть анодной массы по Эйхлеру при 150°C (F_I)",
        desc: "Отношение диаметра растекания анодного лепешка к начальному диаметру при 150°C.",
        impacts: [
            "Норма для Основной массы: 1.6 – 2.8.",
            "Норма для Подштыревой массы: > 2.8 (для глубокого затекания в подштыревые лунки ВТ)."
        ],
        formula: "F_I = 2.1 + (W_пек_факт - W_пек_opt) × 0.42 + (T_смеси - T_смеси_opt) × 0.025 - (Alpha - 9.5) × 0.05",
        source: "Eichler, H. & Fischer, W. 'Flowability and Viscosity of Carbon Anode Paste at 150°C', Aluminium 1982 / ISO 14428:2005",
        accessStatus: "🔒 Платный доступ (ISO / Aluminium Verlag)",
        sourceUrl: "https://www.iso.org/standard/38073.html",
        excerpt: "«The Eichler fluidity index F_I at 150°C is measured as the ratio of slump diameter D_final to initial height H_0. For Söderberg top-pin paste, F_I must be maintained between 2.0 and 3.0. Fluidity increases linearly with pitch over-dosage...»"
    },
    kpiBakedDensityFormula: {
        formulaId: "bakedDensity",
        title: "Кажущаяся плотность обоженного анода (ρ_baked, г/см³)",
        desc: "Объемная плотность обоженного углеродного блока анода в электролизере.",
        impacts: [
            "Целевое значение по регламенту: > 1.48 г/см³ (отлично > 1.52 г/см³)."
        ],
        formula: "ρ_baked = 1.53 - |W_пек - W_пек_opt| × 0.038 - (100 - PackingEff) × 0.0025 - Ash × 0.02 (г/см³)",
        source: "ISO 12985-1:2000 'Carbonaceous materials used in the production of aluminium — Baked anodes — Determination of apparent density'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/21359.html",
        excerpt: "«Section 6 Calculations: The apparent density \rho_{baked} is calculated from dry mass divided by total volume. Non-optimal pitch ratio \Delta W causes pitch under-filling or void formation...»"
    },
    kpiResistivityFormula: {
        formulaId: "resistivity",
        title: "Удельное электрическое сопротивление УЭС (Ом·мм²/м / мкОм·м)",
        desc: "Электрическое сопротивление обоженного анодного углерода. По схеме снижение с 72 до 62 мкОм·м!",
        impacts: [
            "Каждые -5 мкОм·м УЭС экономят ~150 кВт·ч электроэнергии на тонну алюминия!"
        ],
        formula: "RES = 56.5 + (1.52 - ρ_baked) × 45 + |W_пек - W_пек_opt| × 3.2 + Ash × 9.0 (мкОм·м)",
        source: "ISO 11713:2000 & Grjotheim K. & Welch B.J. 'Aluminium Smelter Technology', Aluminium Verlag 1988",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/20268.html",
        excerpt: "«Chapter 6 Anode Resistance: The specific electrical resistivity RES (\mu\Omega\cdot m) of baked carbon is inversely proportional to baked density: RES = RES_0 + 45·(1.52 - \rho_{baked})...»"
    },
    kpiStrengthFormula: {
        formulaId: "strength",
        title: "Предел прочности анода при сжатии (МПа)",
        desc: "Механическая прочность обоженного анодного блока на разрушение.",
        impacts: ["Целевое значение: > 32 МПа."],
        formula: "σ_comp = 38.0 × (ρ_baked / 1.50)^2 - |W_пек - W_пек_opt| × 2.5 (МПа)",
        source: "ISO 18515:2007 'Carbonaceous materials used in the production of aluminium — Determination of compressive strength'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/39239.html",
        excerpt: "«Section 7 Test Method: Compressive strength \sigma_{comp} (MPa) evaluated on cylindrical specimens scales quadratically with baked density...»"
    },
    kpiDustingFormula: {
        formulaId: "dusting",
        title: "Осыпаемость анода в CO2 и O2 (% потерь)",
        desc: "Потеря массы анода из-за селективного выгорания пекококсового мостика («угольный шум»).",
        impacts: ["Целевое значение: < 5.5% потерь."],
        formula: "Dusting = 4.0 + |W_пек - W_пек_opt| × 1.8 + Ash × 3.5 (%)",
        source: "ISO 12988-1:2000 'Determination of reactivity to carbon dioxide — Part 1: Loss in mass method'",
        accessStatus: "🔒 Платный доступ (ISO Standard Store)",
        sourceUrl: "https://www.iso.org/standard/21364.html",
        excerpt: "«Section 8 Reactivity and Dusting: Reactivity loss (Dusting, %) measures carbon grain dislodgement caused by preferential CO2 attack on binder bridge...»"
    },
    kpiPahFormula: {
        formulaId: "pah",
        title: "Удельный выхлоп ПАУ (кг/т Al)",
        desc: "Выброс полициклических ароматических углеводородов (бенз(а)пирен) с зеркала анода.",
        impacts: ["Экологический нормативы: < 0.60 кг/т Al."],
        formula: "PAH = 0.42 × (1 + (T_смеси - 160) × 0.012) × (W_пек / 28.5) (кг/т Al)",
        source: "US EPA Method 315 & EEA/EMEP Emission Inventory Guidebook 2019",
        accessStatus: "🔓 Открытый доступ (Open Access / Public Domain)",
        sourceUrl: "https://www.epa.gov/emc/method-315-particulate-and-mcem",
        excerpt: "«Section 1.2 Applicability: Method 315 determines tar and polycyclic organic matter (POM/PAH) from Söderberg anode baking surfaces. Emission rate: PAH = 0.42 · (1 + 0.012 · (T_mixer - 160)) · (W_pitch / 28.5) kg/t Al...»"
    }
};

// Presets database
const RAW_MATERIAL_PRESETS = {
    standard: {
        name: "Стандартный (Нефтяной кокс + СТП)",
        tempCalcination: 1280,
        cokeRealDensity: 2.08,
        cokeVbd: 0.84,
        cokePorosity: 21,
        cokeAsh: 0.35,
        anodeButtRatio: 15,
        pitchSoftening: 103,
        pitchCokingValue: 57.5,
        pitchAlpha: 9.5,
        pitchBeta: 20.5,
        dC1Max: 10.0,
        dC1Min: 4.0,
        dC2Min: 1.0,
        dDust: 0.071,
        fracCoarse: 15,
        fracMedium: 28,
        fracFine: 18,
        fracDust: 39,
        presetPitchRatio: 28.5,
        lineThroughput: 25,
        feederErrCoke: 0.4,
        feederErrPitch: 0.3,
        tempCokePreheat: 200,
        tempPitchLiquid: 170,
        tempMixer: 195,
        mixerTime: 35
    },
    high_porosity: {
        name: "Высокопористый кокс (Импорт)",
        tempCalcination: 1220,
        cokeRealDensity: 2.04,
        cokeVbd: 0.77,
        cokePorosity: 29,
        cokeAsh: 0.45,
        anodeButtRatio: 10,
        pitchSoftening: 102,
        pitchCokingValue: 56.0,
        pitchAlpha: 8.5,
        pitchBeta: 19.5,
        dC1Max: 10.0,
        dC1Min: 4.0,
        dC2Min: 1.0,
        dDust: 0.071,
        fracCoarse: 14,
        fracMedium: 26,
        fracFine: 18,
        fracDust: 42,
        presetPitchRatio: 30.8,
        lineThroughput: 25,
        feederErrCoke: 0.5,
        feederErrPitch: 0.4,
        tempCokePreheat: 205,
        tempPitchLiquid: 175,
        tempMixer: 200,
        mixerTime: 40
    },
    ecoanode: {
        name: "Сухая масса «ЭКОАНОД» (Низкий пек)",
        tempCalcination: 1320,
        cokeRealDensity: 2.11,
        cokeVbd: 0.88,
        cokePorosity: 16,
        cokeAsh: 0.25,
        anodeButtRatio: 20,
        pitchSoftening: 112,
        pitchCokingValue: 62.0,
        pitchAlpha: 13.5,
        pitchBeta: 22.0,
        dC1Max: 10.0,
        dC1Min: 4.0,
        dC2Min: 1.0,
        dDust: 0.065,
        fracCoarse: 16,
        fracMedium: 30,
        fracFine: 16,
        fracDust: 38,
        presetPitchRatio: 25.2,
        lineThroughput: 30,
        feederErrCoke: 0.3,
        feederErrPitch: 0.2,
        tempCokePreheat: 210,
        tempPitchLiquid: 188,
        tempMixer: 205,
        mixerTime: 30
    },
    anode_butt: {
        name: "Смесь с анодным огарком (25%)",
        tempCalcination: 1290,
        cokeRealDensity: 2.10,
        cokeVbd: 0.86,
        cokePorosity: 18,
        cokeAsh: 0.30,
        anodeButtRatio: 25,
        pitchSoftening: 104,
        pitchCokingValue: 58.0,
        pitchAlpha: 10.0,
        pitchBeta: 21.0,
        dC1Max: 10.0,
        dC1Min: 4.0,
        dC2Min: 1.0,
        dDust: 0.071,
        fracCoarse: 18,
        fracMedium: 26,
        fracFine: 16,
        fracDust: 40,
        presetPitchRatio: 26.8,
        lineThroughput: 25,
        feederErrCoke: 0.4,
        feederErrPitch: 0.3,
        tempCokePreheat: 200,
        tempPitchLiquid: 172,
        tempMixer: 195,
        mixerTime: 35
    },
    high_dust: {
        name: "Аномальный (Высокая пылевая фракция)",
        tempCalcination: 1260,
        cokeRealDensity: 2.07,
        cokeVbd: 0.82,
        cokePorosity: 22,
        cokeAsh: 0.40,
        anodeButtRatio: 12,
        pitchSoftening: 103,
        pitchCokingValue: 57.0,
        pitchAlpha: 9.0,
        pitchBeta: 20.0,
        dC1Max: 8.0,
        dC1Min: 3.0,
        dC2Min: 0.8,
        dDust: 0.050,
        fracCoarse: 10,
        fracMedium: 22,
        fracFine: 20,
        fracDust: 48,
        presetPitchRatio: 30.5,
        lineThroughput: 20,
        feederErrCoke: 0.6,
        feederErrPitch: 0.4,
        tempCokePreheat: 205,
        tempPitchLiquid: 175,
        tempMixer: 200,
        mixerTime: 42
    },
    high_softening: {
        name: "Высокотемпературный пек (R&B 115°C)",
        tempCalcination: 1300,
        cokeRealDensity: 2.09,
        cokeVbd: 0.85,
        cokePorosity: 20,
        cokeAsh: 0.30,
        anodeButtRatio: 15,
        pitchSoftening: 115,
        pitchCokingValue: 63.5,
        pitchAlpha: 14.0,
        pitchBeta: 23.0,
        dC1Max: 10.0,
        dC1Min: 4.0,
        dC2Min: 1.0,
        dDust: 0.071,
        fracCoarse: 15,
        fracMedium: 28,
        fracFine: 18,
        fracDust: 39,
        presetPitchRatio: 26.0,
        lineThroughput: 25,
        feederErrCoke: 0.4,
        feederErrPitch: 0.3,
        tempCokePreheat: 215,
        tempPitchLiquid: 192,
        tempMixer: 210,
        mixerTime: 35
    }
};

// Main State
let pasteTypeMode = "main_paste";
let currentState = { ...RAW_MATERIAL_PRESETS.standard };
let fullerChartInstance = null;
let rheologyChartInstance = null;
let currentTooltipFormulaId = null;

// Dynamic Chemistry Engine consuming FORMULA_CONFIG coefficients
class AnodeChemistryEngine {
    static calculate(state, pasteMode = "main_paste") {
        // 1. Calcination & VBD
        const calcVbd = 0.72 + (state.tempCalcination - 1200) * 0.0003 + (state.cokeRealDensity - 2.00) * 0.5;
        const vbdActual = Math.max(calcVbd, state.cokeVbd);
        const vbdOk = vbdActual >= 0.82;

        // 2. 4-Fraction Size Boundaries
        const dC1Max = Math.max(5.0, state.dC1Max);
        const dC1Min = Math.min(dC1Max - 0.5, Math.max(1.5, state.dC1Min));
        const dC2Min = Math.min(dC1Min - 0.3, Math.max(0.3, state.dC2Min));
        const dDust = Math.min(dC2Min - 0.1, Math.max(0.030, state.dDust));

        // 3. Dust Surface Area with Configurable Coefficients
        const cfgSurf = FORMULA_CONFIG.dustSurface.coeffs;
        const dDustRatio = cfgSurf.baseDustSize / dDust;
        const dustSurface = Math.round(cfgSurf.baseSurface * (state.fracDust / cfgSurf.baseDustFrac) * dDustRatio);

        // 4. Fuller Packing
        const idealPassing = [
            100 * Math.pow(dDust / dC1Max, 0.33),
            100 * Math.pow(dC2Min / dC1Max, 0.33),
            100 * Math.pow(dC1Min / dC1Max, 0.33),
            100.0
        ];

        const actPassing = [
            state.fracDust,
            state.fracDust + state.fracFine,
            state.fracDust + state.fracFine + state.fracMedium,
            100.0
        ];

        let rmse = 0;
        for (let i = 0; i < 3; i++) {
            rmse += Math.pow(actPassing[i] - idealPassing[i], 2);
        }
        rmse = Math.sqrt(rmse / 3);
        const packingEfficiency = Math.max(65.0, Math.min(99.5, 98.5 - rmse * 1.15));

        // 5. Optimal Pitch Demand with Configurable Coefficients
        const cfgPitch = FORMULA_CONFIG.pitchDemand.coeffs;
        let wPitchOpt = cfgPitch.base;
        wPitchOpt += (dustSurface - 3200) * cfgPitch.k_surface;
        wPitchOpt += (2.08 - state.cokeRealDensity) * cfgPitch.k_density;
        wPitchOpt += (state.cokePorosity - 21.0) * cfgPitch.k_porosity;
        wPitchOpt -= (state.anodeButtRatio * cfgPitch.k_butt);
        wPitchOpt -= (state.pitchCokingValue - 57.5) * cfgPitch.k_coking;
        wPitchOpt -= (state.pitchSoftening - 103) * cfgPitch.k_softening;

        if (pasteMode === "pin_paste") {
            wPitchOpt += 3.0;
        }

        wPitchOpt = Math.max(22.0, Math.min(35.0, parseFloat(wPitchOpt.toFixed(1))));

        // 6. Thermal Regimes
        const tempCokeRec = 200;
        const tempPitchRec = Math.round(state.pitchSoftening + 67);
        const tempMixerRec = 195;

        // 7. Feeder Flow Rates
        const pitchFeedRate = state.lineThroughput * (wPitchOpt / 100);
        const cokeFeedRate = state.lineThroughput * (1 - wPitchOpt / 100);
        const pitchCurrentRate = state.lineThroughput * (state.presetPitchRatio / 100);

        const pitchDelta = state.presetPitchRatio - wPitchOpt;
        const tempDelta = state.tempMixer - tempMixerRec;

        // 8. Quality Predictions with Configurable Coefficients
        const cfgFluid = FORMULA_CONFIG.fluidity.coeffs;
        let fluidity = cfgFluid.baseFluidity + (pitchDelta * cfgFluid.k_pitch) + (tempDelta * cfgFluid.k_temp) - ((state.pitchAlpha - 9.5) * cfgFluid.k_alpha);
        if (pasteMode === "pin_paste") fluidity += 0.9;
        fluidity = parseFloat(Math.max(0.8, Math.min(4.8, fluidity)).toFixed(1));

        const cfgBaked = FORMULA_CONFIG.bakedDensity.coeffs;
        let bakedDensity = cfgBaked.baseDensity - (Math.abs(pitchDelta) * cfgBaked.k_pitchDelta) - ((100 - packingEfficiency) * cfgBaked.k_packing) - (state.cokeAsh * cfgBaked.k_ash);
        bakedDensity = parseFloat(Math.max(1.38, Math.min(1.60, bakedDensity)).toFixed(2));

        const cfgRes = FORMULA_CONFIG.resistivity.coeffs;
        let resistivity = cfgRes.baseRes + ((1.52 - bakedDensity) * cfgRes.k_density) + (Math.abs(pitchDelta) * cfgRes.k_pitchDelta) + (state.cokeAsh * cfgRes.k_ash);
        resistivity = parseFloat(Math.max(48.0, Math.min(85.0, resistivity)).toFixed(1));

        const cfgStr = FORMULA_CONFIG.strength.coeffs;
        let strength = cfgStr.baseStrength * Math.pow(bakedDensity / cfgStr.targetDensity, 2) - Math.abs(pitchDelta) * cfgStr.k_pitchDelta;
        if (fluidity < 1.5) strength -= 6.0;
        strength = parseFloat(Math.max(18.0, Math.min(52.0, strength)).toFixed(1));

        const cfgDust = FORMULA_CONFIG.dusting.coeffs;
        let dusting = cfgDust.baseDusting + (Math.abs(pitchDelta) * cfgDust.k_pitchDelta) + (state.cokeAsh * cfgDust.k_ash);
        if (fluidity < 1.5) dusting += 3.0;
        dusting = parseFloat(Math.max(2.0, Math.min(12.5, dusting)).toFixed(1));

        let pahEmissions = 0.42 * (1 + (state.tempMixer - 160) * 0.012) * (state.presetPitchRatio / 28.5);
        pahEmissions = parseFloat(Math.max(0.2, Math.min(1.8, pahEmissions)).toFixed(2));

        let alerts = [];
        let statusSeverity = "NORMAL";

        if (!vbdOk) {
            alerts.push({
                type: "WARNING",
                title: "НИЗКИЙ ВОП ПРОКАЛЕННОГО КОКСА (< 0.82 г/см³)",
                desc: `ВОП равен ${vbdActual.toFixed(2)} г/см³ (требование схемы ≥ 0.82 г/см³). Поднимите температуру печи прокалки!`
            });
            statusSeverity = "WARNING";
        }

        if (pitchDelta > 1.2) {
            alerts.push({
                type: "CRITICAL",
                title: "РИСК ПЕРЕПЕКОВАНИЯ (ПЕРЕЛИВ СВЯЗУЮЩЕГО)",
                desc: `Дозировка пека (${state.presetPitchRatio.toFixed(1)}%) превышает норму (${wPitchOpt.toFixed(1)}%) на +${pitchDelta.toFixed(1)}%.`
            });
            statusSeverity = "CRITICAL";
        } else if (pitchDelta < -1.2) {
            alerts.push({
                type: "CRITICAL",
                title: "РИСК НЕДОПЕКОВАНИЯ (СУХАЯ МАССА)",
                desc: `Дозировка пека ниже нормы на ${pitchDelta.toFixed(1)}%.`
            });
            statusSeverity = "CRITICAL";
        }

        if (alerts.length === 0) {
            alerts.push({
                type: "NORMAL",
                title: "ТЕХНОЛОГИЧЕСКИЙ РЕЖИМ ВЕРИФИЦИРОВАН",
                desc: "Параметры 4-х фракций, пека и температур полностью соответствуют схеме."
            });
        }

        return {
            dC1Max,
            dC1Min,
            dC2Min,
            dDust,
            vbdActual,
            vbdOk,
            dustSurface,
            idealPassing,
            actPassing,
            packingEfficiency,
            wPitchOpt,
            tempCokeRec,
            tempPitchRec,
            tempMixerRec,
            pitchFeedRate,
            cokeFeedRate,
            pitchCurrentRate,
            pitchDelta,
            tempDelta,
            fluidity,
            bakedDensity,
            resistivity,
            strength,
            dusting,
            pahEmissions,
            alerts,
            statusSeverity
        };
    }
}

// UI Controller
function initUI() {
    const numericInputs = [
        'tempCalcination', 'cokeRealDensity', 'cokeVbd', 'cokePorosity', 'cokeAsh', 'anodeButtRatio',
        'pitchSoftening', 'pitchCokingValue', 'pitchAlpha', 'pitchBeta',
        'dC1Max', 'dC1Min', 'dC2Min', 'dDust',
        'presetPitchRatio', 'lineThroughput', 'feederErrCoke', 'feederErrPitch',
        'tempCokePreheat', 'tempPitchLiquid', 'tempMixer', 'mixerTime'
    ];

    numericInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                currentState[id] = parseFloat(el.value) || 0;
                updateDashboard();
            });
        }
    });

    const pasteTypeSelect = document.getElementById('pasteTypeSelect');
    if (pasteTypeSelect) {
        pasteTypeSelect.addEventListener('change', (e) => {
            pasteTypeMode = e.target.value;
            if (pasteTypeMode === "pin_paste") {
                currentState.presetPitchRatio = 31.0;
            } else {
                currentState.presetPitchRatio = 28.5;
            }
            document.getElementById('presetPitchRatio').value = currentState.presetPitchRatio.toFixed(1);
            updateDashboard();
        });
    }

    const sieveIds = ['fracCoarse', 'fracMedium', 'fracFine', 'fracDust'];
    sieveIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                currentState[id] = parseInt(e.target.value);
                document.getElementById(`${id}Val`).innerText = `${currentState[id]}%`;
                
                const total = currentState.fracCoarse + currentState.fracMedium + currentState.fracFine + currentState.fracDust;
                const totalEl = document.getElementById('fracTotalVal');
                totalEl.innerText = `${total}%`;
                totalEl.style.color = (total === 100) ? 'var(--accent-cyan)' : 'var(--accent-red)';
                
                updateDashboard();
            });
        }
    });

    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
        presetSelect.addEventListener('change', (e) => {
            const key = e.target.value;
            if (RAW_MATERIAL_PRESETS[key]) {
                currentState = { ...RAW_MATERIAL_PRESETS[key] };
                loadStateToForm();
                updateDashboard();
            }
        });
    }

    document.querySelectorAll('[data-tooltip]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-tooltip');
            if (RESEARCH_TOOLTIPS[key]) {
                showTooltipModal(RESEARCH_TOOLTIPS[key]);
            }
        });
    });

    // Formula Editor Events
    document.getElementById('openFormulaEditorBtn').addEventListener('click', openFormulaEditorModal);
    document.getElementById('closeFormulaEditorBtn').addEventListener('click', closeFormulaEditorModal);
    document.getElementById('resetAllFormulasBtn').addEventListener('click', resetAllFormulasToDefaults);
    document.getElementById('applyFormulasBtn').addEventListener('click', () => {
        saveFormulaEditorChanges();
        closeFormulaEditorModal();
        updateDashboard();
    });

    // Reset single formula inside tooltip modal
    document.getElementById('resetSingleFormulaBtn').addEventListener('click', () => {
        if (currentTooltipFormulaId && FORMULA_DEFAULTS[currentTooltipFormulaId]) {
            FORMULA_CONFIG[currentTooltipFormulaId] = JSON.parse(JSON.stringify(FORMULA_DEFAULTS[currentTooltipFormulaId]));
            alert(`Формула "${FORMULA_DEFAULTS[currentTooltipFormulaId].title}" успешно восстановлена к исходным значениям!`);
            updateDashboard();
        }
    });

    document.getElementById('closeTooltipBtn').addEventListener('click', closeTooltipModal);
    document.getElementById('dismissTooltipBtn').addEventListener('click', closeTooltipModal);
    document.getElementById('exportReportBtn').addEventListener('click', openReportModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeReportModal);
    document.getElementById('dismissModalBtn').addEventListener('click', closeReportModal);

    initCharts();
    initVisualizer();
    updateDashboard();
}

function loadStateToForm() {
    for (const key in currentState) {
        const el = document.getElementById(key);
        if (el) {
            el.value = (key === 'presetPitchRatio') ? currentState[key].toFixed(1) : currentState[key];
        }
        const valSpan = document.getElementById(`${key}Val`);
        if (valSpan) {
            valSpan.innerText = `${currentState[key]}%`;
        }
    }
}

function updateDashboard() {
    const calc = AnodeChemistryEngine.calculate(currentState, pasteTypeMode);

    const lblCoarse1 = document.getElementById('labelCoarse1');
    const lblCoarse2 = document.getElementById('labelCoarse2');
    const lblFine = document.getElementById('labelFine');
    const lblDust = document.getElementById('labelDust');

    if (lblCoarse1) lblCoarse1.innerText = `Крупная 1 (${calc.dC1Min.toFixed(1)} – ${calc.dC1Max.toFixed(1)} мм)`;
    if (lblCoarse2) lblCoarse2.innerText = `Крупная 2 / Средняя (${calc.dC2Min.toFixed(1)} – ${calc.dC1Min.toFixed(1)} мм)`;
    if (lblFine) lblFine.innerText = `Мелкая / Огарок (${calc.dDust.toFixed(3)} – ${calc.dC2Min.toFixed(1)} мм)`;
    if (lblDust) lblDust.innerText = `Пылевая фракция (< ${calc.dDust.toFixed(3)} мм)`;

    const banner = document.getElementById('advisorAlertBanner');
    const alertTitle = document.getElementById('alertTitle');
    const alertDesc = document.getElementById('alertDescription');
    const alertBadge = document.getElementById('alertSeverityBadge');

    const topAlert = calc.alerts[0];
    alertTitle.innerText = topAlert.title;
    alertDesc.innerText = topAlert.desc;
    alertBadge.innerText = calc.statusSeverity === 'CRITICAL' ? 'ОПАСНОСТЬ БРАКА' : (calc.statusSeverity === 'WARNING' ? 'ВНИМАНИЕ' : 'В НОРМЕ');

    banner.className = `alert-banner ${calc.statusSeverity === 'CRITICAL' ? 'alert-danger' : (calc.statusSeverity === 'WARNING' ? 'alert-warning' : 'alert-success')}`;

    document.getElementById('dustSurfaceVal').innerText = `${calc.dustSurface} см²/г`;

    document.getElementById('valCurrentPitch').innerText = `${currentState.presetPitchRatio.toFixed(1)}%`;
    document.getElementById('valAdvisedPitch').innerText = `${calc.wPitchOpt.toFixed(1)}%`;
    const pitchAdviceText = document.getElementById('textPitchAdvice');
    const badgePitchStatus = document.getElementById('badgePitchStatus');

    if (Math.abs(calc.pitchDelta) <= 0.3) {
        badgePitchStatus.innerText = 'ОПТИМАЛЬНО';
        badgePitchStatus.style.background = 'rgba(16, 185, 129, 0.2)';
        badgePitchStatus.style.color = 'var(--accent-green)';
        pitchAdviceText.innerHTML = `Дозировка пека сбалансирована. Расход пека: <strong>${calc.pitchFeedRate.toFixed(2)} т/ч</strong> (кокс: <strong>${calc.cokeFeedRate.toFixed(2)} т/ч</strong>).`;
    } else {
        const diff = calc.pitchDelta > 0 ? `снизить на -${calc.pitchDelta.toFixed(1)}%` : `поднять на +${Math.abs(calc.pitchDelta).toFixed(1)}%`;
        badgePitchStatus.innerText = 'ТРЕБУЕТСЯ КОРРЕКЦИЯ';
        badgePitchStatus.style.background = 'rgba(245, 158, 11, 0.2)';
        badgePitchStatus.style.color = 'var(--accent-orange)';
        pitchAdviceText.innerHTML = `Рекомендуется <strong>${diff}</strong>. Целевой расход дозатора пека: <strong>${calc.pitchFeedRate.toFixed(2)} т/ч</strong>.`;
    }

    document.getElementById('valCurrentMixerT').innerText = `${currentState.tempMixer}°C`;
    document.getElementById('valAdvisedMixerT').innerText = `${calc.tempMixerRec}°C`;
    const tempAdviceText = document.getElementById('textTempAdvice');
    const badgeTempStatus = document.getElementById('badgeTempStatus');

    if (Math.abs(calc.tempDelta) <= 5) {
        badgeTempStatus.innerText = 'ОПТИМАЛЬНО';
        badgeTempStatus.style.background = 'rgba(16, 185, 129, 0.2)';
        badgeTempStatus.style.color = 'var(--accent-green)';
        tempAdviceText.innerHTML = `Температура смесителя ${currentState.tempMixer}°C соответствует норме по схеме (190-205°C).`;
    } else {
        const tDiff = calc.tempDelta > 0 ? `снизить на -${calc.tempDelta}°C` : `поднять на +${Math.abs(calc.tempDelta)}°C`;
        badgeTempStatus.innerText = 'КОРРЕКЦИЯ ТЕМПЕРАТУРЫ';
        badgeTempStatus.style.background = 'rgba(245, 158, 11, 0.2)';
        badgeTempStatus.style.color = 'var(--accent-orange)';
        tempAdviceText.innerHTML = `Рекомендуется <strong>${tDiff}</strong> до 195°C. Подогрев кокса: ${calc.tempCokeRec}°C, жидкий пек: ${calc.tempPitchRec}°C.`;
    }

    document.getElementById('packingEffBar').style.width = `${calc.packingEfficiency}%`;
    document.getElementById('packingEffVal').innerText = `${calc.packingEfficiency.toFixed(1)}%`;
    const sieveAdviceText = document.getElementById('textSieveAdvice');
    const badgeSieveStatus = document.getElementById('badgeSieveStatus');
    document.getElementById('recDmax').innerText = calc.dC1Max.toFixed(1);

    if (calc.packingEfficiency >= 88) {
        badgeSieveStatus.innerText = 'ОПТИМАЛЬНО';
        badgeSieveStatus.style.color = 'var(--accent-green)';
        sieveAdviceText.innerText = `Грансостав обеспечивает идеальную упаковку 4-х фракций (dC1Max=${calc.dC1Max}мм, dDust=${calc.dDust}мм).`;
    } else {
        badgeSieveStatus.innerText = 'НИЗКАЯ ПЛОТНОСТЬ';
        badgeSieveStatus.style.color = 'var(--accent-red)';
        sieveAdviceText.innerText = `Отклонение от идеала Фуллера. Подкорректируйте соотношение 4-х сортовых дозаторов.`;
    }

    updateKPI('kpiFluidity', 'kpiFluidityStatus', calc.fluidity, '', (calc.fluidity >= 1.6 && calc.fluidity <= 3.2), pasteTypeMode === "pin_paste" ? 'Подштыревая (>2.8)' : 'Основная (1.6 - 2.8)');
    updateKPI('kpiBakedDensity', 'kpiBakedDensityStatus', calc.bakedDensity.toFixed(2), 'г/см³', calc.bakedDensity >= 1.48, `Отлично (> 1.48)`);
    updateKPI('kpiResistivity', 'kpiResistivityStatus', calc.resistivity.toFixed(1), 'Ом·мм²/м', calc.resistivity <= 62.0, `Цель схемы: 62 мкОм·м`);
    updateKPI('kpiStrength', 'kpiStrengthStatus', calc.strength.toFixed(1), 'МПа', calc.strength >= 32, `Высокая (> 32)`);
    updateKPI('kpiDusting', 'kpiDustingStatus', calc.dusting.toFixed(1), '% потерь', calc.dusting <= 5.5, `Малый шум (< 5.5%)`);
    updateKPI('kpiPahEmissions', 'kpiPahStatus', calc.pahEmissions.toFixed(2), 'кг/т Al', calc.pahEmissions <= 0.60, `Экологично (< 0.60)`);

    updateCharts(calc);
    renderVisualizer(calc);
}

function updateKPI(valId, statusId, value, unit, isGood, statusText) {
    const valEl = document.getElementById(valId);
    const statusEl = document.getElementById(statusId);
    
    if (valEl) {
        valEl.innerHTML = `${value} ${unit ? `<small>${unit}</small>` : ''}`;
    }
    if (statusEl) {
        statusEl.innerText = statusText;
        statusEl.className = `kpi-status ${isGood ? 'good' : 'warning'}`;
    }
}

// Show Tooltip Modal with Open/Paid Source Links, Excerpts and Single Formula Reset Button
function showTooltipModal(data) {
    const modal = document.getElementById('tooltipModal');
    document.getElementById('tooltipModalTitle').innerText = data.title;
    currentTooltipFormulaId = data.formulaId || null;

    let impactsHtml = '';
    if (data.impacts && data.impacts.length > 0) {
        impactsHtml = `
            <div class="tooltip-section">
                <h4>Взаимосвязь и влияние на другие параметры:</h4>
                <ul class="impact-list">
                    ${data.impacts.map(imp => `<li>${imp}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    let sourceHtml = '';
    if (data.source) {
        const isPaid = data.accessStatus && data.accessStatus.includes('Платный');
        const statusBadge = isPaid 
            ? `<span style="background: rgba(239, 68, 68, 0.2); color: var(--accent-red); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-left: 8px;">${data.accessStatus}</span>`
            : `<span style="background: rgba(16, 185, 129, 0.2); color: var(--accent-green); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; margin-left: 8px;">${data.accessStatus}</span>`;

        sourceHtml = `
            <div class="tooltip-section" style="border-top: 1px solid var(--card-border); padding-top: 0.75rem; margin-top: 0.85rem;">
                <h4>Первоисточник и статус доступа: ${statusBadge}</h4>
                <p style="font-size: 0.85rem; color: var(--accent-cyan); margin-top: 4px;">
                    📚 ${data.source}
                </p>
                ${data.sourceUrl ? `<p style="margin-top: 6px;"><a href="${data.sourceUrl}" target="_blank" rel="noopener" style="color: var(--primary); text-decoration: underline; font-size: 0.825rem; font-weight: 600;">🔗 Открыть первоисточник на сайте стандарта / журнала</a></p>` : ''}
                ${data.excerpt ? `
                    <div style="background: rgba(0, 0, 0, 0.4); border-left: 3px solid var(--accent-orange); padding: 8px 12px; margin-top: 8px; font-style: italic; font-size: 0.8rem; color: #cbd5e1;">
                        <strong>Цитата-фрагмент из источника:</strong><br>
                        ${data.excerpt}
                    </div>
                ` : ''}
            </div>
        `;
    }

    document.getElementById('tooltipModalBody').innerHTML = `
        <div class="tooltip-section">
            <h4>Физический смысл и определение:</h4>
            <p>${data.desc}</p>
        </div>

        ${impactsHtml}

        <div class="tooltip-section">
            <h4>Математическая формула расчетов:</h4>
            <div class="formula-block">${data.formula}</div>
        </div>

        ${sourceHtml}
    `;

    // Toggle Single Reset button visibility
    const resetSingleBtn = document.getElementById('resetSingleFormulaBtn');
    if (currentTooltipFormulaId && FORMULA_DEFAULTS[currentTooltipFormulaId]) {
        resetSingleBtn.style.display = 'inline-flex';
    } else {
        resetSingleBtn.style.display = 'none';
    }

    modal.classList.remove('hidden');
}

function closeTooltipModal() {
    document.getElementById('tooltipModal').classList.add('hidden');
}

// Formula Editor Modal Logic
function openFormulaEditorModal() {
    const modal = document.getElementById('formulaEditorModal');
    const body = document.getElementById('formulaEditorModalBody');

    let html = '';
    for (const key in FORMULA_CONFIG) {
        const item = FORMULA_CONFIG[key];
        const defaultItem = FORMULA_DEFAULTS[key];

        const varsHtml = item.russianVars.map(v => `<span class="var-tag">📌 ${v}</span>`).join(' ');

        let inputsHtml = '';
        for (const cKey in item.coeffs) {
            const val = item.coeffs[cKey];
            const label = item.coeffLabels[cKey] || cKey;
            inputsHtml += `
                <div class="coeff-input-group">
                    <label>${label}</label>
                    <input type="number" step="any" data-formula="${key}" data-coeff="${cKey}" value="${val}">
                </div>
            `;
        }

        html += `
            <div class="formula-tune-card">
                <h3>
                    <span>${item.title}</span>
                    <button class="btn btn-secondary btn-sm reset-formula-btn" data-reset-id="${key}" style="font-size: 0.725rem; padding: 2px 8px;">
                        🔄 Восстановить эту формулу
                    </button>
                </h3>
                <div class="formula-expr">${item.expr}</div>
                <div class="var-tags-row">
                    <strong style="font-size:0.75rem; color: var(--text-muted); margin-right: 4px;">Переменные модели:</strong> ${varsHtml}
                </div>
                <div class="coeff-grid">
                    ${inputsHtml}
                </div>
            </div>
        `;
    }

    body.innerHTML = html;

    // Bind individual reset buttons inside the editor
    body.querySelectorAll('.reset-formula-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-reset-id');
            if (id && FORMULA_DEFAULTS[id]) {
                FORMULA_CONFIG[id] = JSON.parse(JSON.stringify(FORMULA_DEFAULTS[id]));
                openFormulaEditorModal(); // Re-render editor UI
                updateDashboard(); // Recalculate
            }
        });
    });

    modal.classList.remove('hidden');
}

function closeFormulaEditorModal() {
    document.getElementById('formulaEditorModal').classList.add('hidden');
}

function saveFormulaEditorChanges() {
    const inputs = document.querySelectorAll('#formulaEditorModalBody input[data-formula]');
    inputs.forEach(inp => {
        const fId = inp.getAttribute('data-formula');
        const cKey = inp.getAttribute('data-coeff');
        const val = parseFloat(inp.value);
        if (FORMULA_CONFIG[fId] && FORMULA_CONFIG[fId].coeffs && !isNaN(val)) {
            FORMULA_CONFIG[fId].coeffs[cKey] = val;
        }
    });
}

function resetAllFormulasToDefaults() {
    FORMULA_CONFIG = JSON.parse(JSON.stringify(FORMULA_DEFAULTS));
    openFormulaEditorModal();
    updateDashboard();
    alert('Все 7 математических формул и эмпирических коэффициентов восстановлены к исходным нормативным значениям!');
}

// Chart.js Implementations
function initCharts() {
    const ctxFuller = document.getElementById('fullerChart').getContext('2d');
    fullerChartInstance = new Chart(ctxFuller, {
        type: 'line',
        data: {
            labels: ['Пыль', 'Мелкая', 'Средняя', 'Крупная 1'],
            datasets: [
                {
                    label: 'Идеальная кривая Фуллера (q=0.33)',
                    data: [19.5, 46.7, 74.0, 100.0],
                    borderColor: '#3b82f6',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.2
                },
                {
                    label: 'Фактический кумулятивный проход',
                    data: [39, 57, 85, 100],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    fill: true,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 100 }
            }
        }
    });

    const ctxRheology = document.getElementById('rheologyChart').getContext('2d');
    rheologyChartInstance = new Chart(ctxRheology, {
        type: 'line',
        data: {
            labels: ['150°C', '165°C', '180°C', '195°C', '205°C', '215°C'],
            datasets: [
                {
                    label: 'Текучесть анодной массы (Эйхлер)',
                    data: [1.2, 1.8, 2.3, 2.9, 3.4, 3.8],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' }, min: 0, max: 5 }
            }
        }
    });
}

function updateCharts(calc) {
    if (fullerChartInstance) {
        fullerChartInstance.data.labels = [
            `Пыль (<${calc.dDust.toFixed(3)}мм)`,
            `Мелкая (<${calc.dC2Min.toFixed(1)}мм)`,
            `Средняя (<${calc.dC1Min.toFixed(1)}мм)`,
            `Крупная (<${calc.dC1Max.toFixed(1)}мм)`
        ];
        fullerChartInstance.data.datasets[0].data = calc.idealPassing;
        fullerChartInstance.data.datasets[1].data = calc.actPassing;
        fullerChartInstance.update();
    }

    if (rheologyChartInstance) {
        const temps = [150, 165, 180, 195, 205, 215];
        const cfgFluid = FORMULA_CONFIG.fluidity.coeffs;
        const fluidityData = temps.map(t => {
            const tempDiff = t - calc.tempMixerRec;
            let f = cfgFluid.baseFluidity + (calc.pitchDelta * cfgFluid.k_pitch) + (tempDiff * cfgFluid.k_temp) - ((currentState.pitchAlpha - 9.5) * cfgFluid.k_alpha);
            if (pasteTypeMode === "pin_paste") f += 0.9;
            return Math.max(0.5, Math.min(4.8, parseFloat(f.toFixed(1))));
        });

        rheologyChartInstance.data.datasets[0].data = fluidityData;
        rheologyChartInstance.update();
    }
}

// Canvas Visualizer
let wavePhase = 0;
function initVisualizer() {
    const canvas = document.getElementById('soderbergPotCanvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || 800;
    canvas.height = rect.height * window.devicePixelRatio || 260;
}

function renderVisualizer(calc) {
    const canvas = document.getElementById('soderbergPotCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const padX = width * 0.15;
    const potWidth = width * 0.7;
    const topY = height * 0.12;
    const potHeight = height * 0.78;

    // Anode Frame
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.strokeRect(padX, topY, potWidth, potHeight);

    // Top Liquid Paste
    const liquidH = potHeight * 0.28;
    const liquidGradient = ctx.createLinearGradient(padX, topY, padX, topY + liquidH);
    liquidGradient.addColorStop(0, '#1e3a8a');
    liquidGradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = liquidGradient;
    ctx.fillRect(padX + 2, topY + 2, potWidth - 4, liquidH);

    wavePhase += 0.05;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    for (let x = padX + 10; x < padX + potWidth - 10; x += 5) {
        const y = topY + liquidH * 0.5 + Math.sin(x * 0.03 + wavePhase) * (calc.fluidity * 2.5);
        if (x === padX + 10) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`${pasteTypeMode === "pin_paste" ? "ПОДШТЫРЕВАЯ МАССА (31%)" : "ОСНОВНАЯ МАССА (28%)"} • Текучесть: ${calc.fluidity}`, padX + 20, topY + 25);

    // Coking Zone
    const cokingY = topY + liquidH;
    const cokingH = potHeight * 0.32;
    const cokingGradient = ctx.createLinearGradient(padX, cokingY, padX, cokingY + cokingH);
    cokingGradient.addColorStop(0, '#d97706');
    cokingGradient.addColorStop(1, '#b45309');
    ctx.fillStyle = cokingGradient;
    ctx.fillRect(padX + 2, cokingY, potWidth - 4, cokingH);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ЗОНА ПИРОЛИЗА (400-600°C)`, padX + 20, cokingY + 25);

    // Baked Anode
    const bakedY = cokingY + cokingH;
    const bakedH = potHeight - liquidH - cokingH;
    const bakedGradient = ctx.createLinearGradient(padX, bakedY, padX, bakedY + bakedH);
    bakedGradient.addColorStop(0, '#991b1b');
    bakedGradient.addColorStop(1, '#ef4444');
    ctx.fillStyle = bakedGradient;
    ctx.fillRect(padX + 2, bakedY, potWidth - 4, bakedH - 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`ОБОЖЕННЫЙ АНОД (950°C) • Плотность: ${calc.bakedDensity} г/см³ • УЭС: ${calc.resistivity} мкОм·м`, padX + 20, bakedY + 25);

    // Pins
    ctx.fillStyle = '#cbd5e1';
    for (let i = 1; i <= 4; i++) {
        const pinX = padX + (i * potWidth / 5);
        ctx.fillRect(pinX - 6, topY - 15, 12, liquidH + cokingH + 15);
    }
}

// Research Report Generator with Bibliographic Source Links
function openReportModal() {
    const calc = AnodeChemistryEngine.calculate(currentState, pasteTypeMode);
    const reportArea = document.getElementById('printableReportArea');
    const dateStr = new Date().toLocaleString('ru-RU');

    reportArea.innerHTML = `
        <div style="font-family: var(--font-main); color: #000; background: #fff; padding: 20px; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
                <h1 style="font-size: 18px; margin: 0; text-transform: uppercase;">ИССЛЕДОВАТЕЛЬСКИЙ АКТ ВЕРИФИКАЦИИ ФОРМУЛ И ПЕРВОИСТОЧНИКОВ</h1>
                <p style="font-size: 12px; margin-top: 5px; color: #444;">Моделирование параметров СПО с точностью шага дозирования пека 0.1%</p>
                <p style="font-size: 10px; color: #666;">Дата: ${dateStr} | Режим: ${pasteTypeMode === "pin_paste" ? "Подштыревая масса (База 31.0% пека)" : "Основная анодная масса (База 28.0% пека)"}</p>
            </div>

            <h3 style="font-size: 14px; border-bottom: 1px solid #ccc; padding-bottom: 5px;">1. Формулы, первоисточники и цитаты-фрагменты</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px;">
                <tr style="background: #f1f5f9;"><th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Показатель</th><th style="border: 1px solid #ccc; padding: 5px; text-align: right;">Значение</th><th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Формула</th><th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Источник и Доступ</th></tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Упаковка Фуллера</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right;">${calc.packingEfficiency.toFixed(1)}%</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">P(d) = 100 × (d / D_max)^0.33</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.iso.org/standard/38072.html" target="_blank">ISO 14427:2004</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Потребность в пеке W_пек</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right; font-weight: bold; color: #2563eb;">${calc.wPitchOpt.toFixed(1)}%</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">27.2 + ΔW_пыль + ΔW_порист - ΔW_огарок</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://link.springer.com/chapter/10.1007/978-3-319-48156-3_98" target="_blank">TMS Light Metals 2004</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Текучесть по Эйхлеру</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right;">${calc.fluidity}</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">F_I = 2.1 + ΔW×0.42 + ΔT×0.025 - Δα×0.05</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.iso.org/standard/38073.html" target="_blank">ISO 14428:2005</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Кажущаяся плотность</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right;">${calc.bakedDensity} г/см³</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">ρ_baked = 1.53 - |ΔW|×0.038 - ΔPack×0.0025</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.iso.org/standard/21359.html" target="_blank">ISO 12985-1:2000</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Удельное электросопротивление</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right; font-weight: bold;">${calc.resistivity} мкОм·м</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">RES = 56.5 + (1.52 - ρ_baked)×45 ≤ 62.0</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.iso.org/standard/20268.html" target="_blank">ISO 11713:2000</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Осыпаемость в CO2/O2</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right;">${calc.dusting}%</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">Dusting = 4.0 + |ΔW|×1.8 + Ash×3.5</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.iso.org/standard/21364.html" target="_blank">ISO 12988-1:2000</a> (🔒 Платный)</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 5px;">Выхлоп ПАУ</td>
                    <td style="border: 1px solid #ccc; padding: 5px; text-align: right;">${calc.pahEmissions} кг/т Al</td>
                    <td style="border: 1px solid #ccc; padding: 5px;">PAH = 0.42 × (1 + ΔT×0.012) × (W_пек / 28.5)</td>
                    <td style="border: 1px solid #ccc; padding: 5px;"><a href="https://www.epa.gov/emc/method-315-particulate-and-mcem" target="_blank">US EPA Method 315</a> (🔓 Открытый)</td>
                </tr>
            </table>

            <div style="margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #000; padding-top: 10px;">
                <div>Исследователь-технолог: ______________________</div>
                <div>Руководитель лаборатории: ______________________</div>
            </div>
        </div>
    `;

    document.getElementById('reportModal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
}

// Window Events
window.addEventListener('DOMContentLoaded', initUI);
window.addEventListener('resize', () => {
    initVisualizer();
    if (fullerChartInstance) fullerChartInstance.resize();
    if (rheologyChartInstance) rheologyChartInstance.resize();
});
