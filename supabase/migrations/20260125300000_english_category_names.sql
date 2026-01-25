-- Update category names to English for better readability

-- Update income categories
UPDATE cashflow_categories SET name = 'Private Lessons' WHERE name = 'שיעורים פרטיים';
UPDATE cashflow_categories SET name = 'Group Lessons' WHERE name = 'שיעורים קבוצתיים';
UPDATE cashflow_categories SET name = 'Monthly Subscriptions' WHERE name = 'מנויים חודשיים';
UPDATE cashflow_categories SET name = 'Digital Courses' WHERE name = 'קורסים דיגיטליים';
UPDATE cashflow_categories SET name = 'Events & Performances' WHERE name = 'אירועים והופעות';
UPDATE cashflow_categories SET name = 'Other Income' WHERE name = 'הכנסות אחרות';

-- Update expense categories (keeping specific service names)
UPDATE cashflow_categories SET name = 'Studio Rent' WHERE name = 'שכירות סטודיו';
UPDATE cashflow_categories SET name = 'Advertising & Marketing' WHERE name = 'פרסום ושיווק';
UPDATE cashflow_categories SET name = 'Equipment & Tools' WHERE name = 'ציוד וכלים';
UPDATE cashflow_categories SET name = 'Software & Digital Subscriptions' WHERE name = 'תוכנה ומנויים דיגיטליים';
UPDATE cashflow_categories SET name = 'Insurance' WHERE name = 'ביטוח';
UPDATE cashflow_categories SET name = 'Taxes & Fees' WHERE name = 'מיסים ואגרות';
UPDATE cashflow_categories SET name = 'Travel' WHERE name = 'נסיעות';
UPDATE cashflow_categories SET name = 'Electricity & Water' WHERE name = 'חשמל ומים';
UPDATE cashflow_categories SET name = 'Phone & Internet' WHERE name = 'טלפון ואינטרנט';
UPDATE cashflow_categories SET name = 'Salaries' WHERE name = 'משכורות';
UPDATE cashflow_categories SET name = 'Subcontractors' WHERE name = 'קבלני משנה';
UPDATE cashflow_categories SET name = 'Office Supplies' WHERE name = 'ציוד משרדי';
UPDATE cashflow_categories SET name = 'Maintenance & Repairs' WHERE name = 'אחזקה ותיקונים';
UPDATE cashflow_categories SET name = 'Other Expenses' WHERE name = 'הוצאות אחרות';

-- Update other expense categories
UPDATE cashflow_categories SET name = 'Loan Repayments' WHERE name = 'החזרי הלוואות';
UPDATE cashflow_categories SET name = 'Capital Purchases' WHERE name = 'רכישות הון';
UPDATE cashflow_categories SET name = 'Owner Withdrawals' WHERE name = 'משיכת בעלים';

-- Update previously migrated Hebrew names
UPDATE cashflow_categories SET name = 'Webflow - Website' WHERE name = 'Webflow - אתר';
UPDATE cashflow_categories SET name = 'TimeoS - Transcriptions' WHERE name = 'TimeoS - תמלולים';
UPDATE cashflow_categories SET name = 'Credit Card Fees (Morning)' WHERE name = 'עמלות כרטיסי אשראי (Morning)';
