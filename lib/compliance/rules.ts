export type ComplianceDate = {
  id: string;
  date: string;
  title: string;
  category: "scheme" | "safety" | "investment" | "record";
  applicability: string;
  action: string;
  source: {
    label: string;
    url: string;
    publishedAt: string;
  };
  verifiedAt: string;
};

export const complianceDates2026: ComplianceDate[] = [
  {
    id: "tams-tranche-13",
    date: "2026-09-04",
    title: "TAMS 3 Tranche 13 closes",
    category: "investment",
    applicability:
      "Only holdings preparing an eligible TAMS 3 capital investment application.",
    action:
      "Check the live scheme page, approval requirements, reference costs, and application status with your adviser.",
    source: {
      label: "DAFM TAMS 3 update",
      url: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/press-releases/minister-heydon-confirms-all-eligible-farm-safety-applications-will-be-approved-under-latest-targeted-agriculture-modernisation-schemes/",
      publishedAt: "2026-05-25",
    },
    verifiedAt: "2026-07-18",
  },
  {
    id: "collaborative-farming-grant",
    date: "2026-09-30",
    title: "Collaborative Farming Grant window closes",
    category: "scheme",
    applicability:
      "Registered Farm Partnerships that are new to the DAFM Farm Partnership Register.",
    action:
      "The published application window runs from 10 August to 30 September 2026. Confirm eligibility and the current form before applying.",
    source: {
      label: "DAFM farm partnerships dates 2026",
      url: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/press-releases/farm-partnerships-key-information-and-dates-2026/",
      publishedAt: "2026-01-19",
    },
    verifiedAt: "2026-07-18",
  },
  {
    id: "farm-safety-measure",
    date: "2026-11-06",
    title: "National Farm Safety Measure closes",
    category: "safety",
    applicability:
      "2026 BISS applicants seeking support for eligible PTO shaft covers.",
    action:
      "Submit the expression of interest before purchase and the payment claim by the published closing date.",
    source: {
      label: "DAFM National Farm Safety Measure 2026",
      url: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/services/national-farm-safety-measure-2026/",
      publishedAt: "2026-05-27",
    },
    verifiedAt: "2026-07-18",
  },
  {
    id: "tams-tranche-14",
    date: "2026-12-04",
    title: "TAMS 3 Tranche 14 closes",
    category: "investment",
    applicability:
      "Only holdings preparing an eligible TAMS 3 capital investment application.",
    action:
      "Treat the date as a planning prompt and confirm the live tranche terms before incurring costs.",
    source: {
      label: "DAFM TAMS 3 update",
      url: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/press-releases/minister-heydon-confirms-all-eligible-farm-safety-applications-will-be-approved-under-latest-targeted-agriculture-modernisation-schemes/",
      publishedAt: "2026-05-25",
    },
    verifiedAt: "2026-07-18",
  },
  {
    id: "succession-planning-grant",
    date: "2026-11-30",
    title: "Succession Planning Advice Grant window closes",
    category: "scheme",
    applicability:
      "Farmers aged 60 or over seeking eligible professional succession-planning advice.",
    action:
      "Confirm eligibility, required advisers, and current application documents before submitting.",
    source: {
      label: "DAFM farm partnerships dates 2026",
      url: "https://www.gov.ie/en/department-of-agriculture-food-and-the-marine/press-releases/farm-partnerships-key-information-and-dates-2026/",
      publishedAt: "2026-01-19",
    },
    verifiedAt: "2026-07-18",
  },
];
