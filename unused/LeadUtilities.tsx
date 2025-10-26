// ✅ Keys to extract from each JSON record
const keysToExtract = [
  "product_name",
  "sender_name",
  "sender_city",
  "sender_state",
  "sender_mobile",
  "sender_email",
  "source",
  "subject",
];

// ✅ Sample JSON data (replace this with your actual JSON)
const leads = [
  {
    ago_time: "1 days",
    generated: 1761400380,
    generated_date: "25 October 2025",
    generated_time: "19:23:00",
    inquiry_type: "BUY",
    landline_number: "+9802009292",
    message:
      "Buyer is looking for 'prefabricated houses'.\n\nSpecification:- Prefabricated Readymade House\n\nContact buyer with your best offer.",
    month_slot: "Oct - 2025",
    product_name: "prefabricated houses",
    product_source: "DialB2B",
    receiver_co: "Portakabin.in u/o Hiresh Isearch",
    receiver_mobile: "+918045476941",
    receiver_name: "Mr. Suresh Chauhan",
    receiver_uid: 23134696,
    rfi_id: "748305204",
    sender: "Client",
    sender_city: "Ambala Cantt",
    sender_co: "Prime fitness",
    sender_country: "India",
    sender_email: "nanchahal_1987@gmail.com",
    sender_mobile: "+919802009292",
    sender_name: "Mr. Rohan",
    sender_state: "Haryana",
    sender_uid: 6295090,
    source: "PHONE_INQUIRY",
    subject: "New Inquiry for Prefabricated houses from Mr. Rohan",
    view_status: "UNREAD",
  },
];

// ✅ Generic function to pick only selected keys
const pickFields = (obj: Record<string, any>, keys: string[]) => {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {} as Record<string, any>);
};

// ✅ Single record slice
const singleLead = leads[0];
const slicedSingle = pickFields(singleLead, keysToExtract);

console.log("✅ Single Record Sliced:");
console.log(slicedSingle);

// ✅ Multiple records slice (if you have more than one lead)
const slicedMultiple = leads.map((lead) => pickFields(lead, keysToExtract));

console.log("✅ Multiple Records Sliced:");
console.log(slicedMultiple);

// ✅ Optional: Extract keys and values separately (for display or export)
const keys = Object.keys(slicedSingle);
const values = Object.values(slicedSingle);

console.log("🗝 Keys:", keys);
console.log("📦 Values:", values);

