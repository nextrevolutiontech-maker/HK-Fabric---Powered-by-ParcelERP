# HK Fabric - Courier & COD Management System

Yeh document is system ke mukammal **Business Flow** ko explain karta hai, taake koi bhi naya staff ya developer asani se samajh sake ke system kaisay kaam karta hai.

---

## 1. Dashboard (Main Screen)
Jab staff system open karta hai to usay sab se pehle Dashboard nazar aata hai. Yeh business ka "Control Room" hai jahan:
- **Today's Revenue:** Aaj ke total orders ki amount.
- **Received COD:** Courier company se kitni cash wasool ho chuki hai.
- **Pending Tracking & Pending COD:** Kitne orders ka tracking number lagna baqi hai, aur kitne parcels deliver ho chuke hain lekin unki COD amount abhi wasool karni hai.
- **Recent Orders:** Naye banne wale orders ki list.

---

## 2. Create Order (Naya Order Book Karna)
Jab koi customer WhatsApp ya Facebook pe order confirm karta hai, to staff **"Create Order"** mein jaata hai.
- **Customer Details:** Name, WhatsApp, Province (Sooba), aur City (Shehar) enter kiya jata hai. Agar custom city ho to manual type kiya ja sakta hai.
- **Products:** Customer ne kon si bedsheet ya item li hai, wo add ki jati hai. System khud-ba-khud **Subtotal** nikalta hai.
- **Delivery Charges:** Agar COD parcel hai ya delivery charges lenay hain to wo enter kiye jatay hain. 
- **Grand Total:** Subtotal + Delivery Charges = Grand Total.
- **Print Label:** Order save hotay hi aik Parcel Label (DC) generate hota hai jo box ke upar lagaya jata hai taake courier company ko diya ja sake. Order ka default status **"Pending"** hota hai.

---

## 3. Orders Management (Orders ki list)
Yahan tamam orders nazar aate hain. 
- Staff **Filters** use kar ke check kar sakta hai ke kis courier ke kitne parcels hain, ya kis Agent (Sami ya Abid) ne kitne orders banaye.
- Agar koi customer order cancel kar de, to order ko **Void (Cancel)** kiya ja sakta hai. Void karne ke liye system Owner ka 4-digit **PIN** mangta hai taake koi fake cancellation na ho.

---

## 4. Tracking Module (Parcel Courier ko Dena)
Jab parcel pack ho kar courier company (e.g., TCS, PostEx, Leopard) ko de diya jata hai, to wo aik Tracking Number dete hain.
- Staff **Tracking** tab mein ja kar order select karta hai, Courier company ka naam aur Tracking Number enter karta hai.
- Aisa karne se order ka status "Pending" se badal kar **"Shipped"** ho jata hai. (Future mein yahan se customer ko auto-WhatsApp message bhi bheja ja sakta hai).

---

## 5. Receive COD (Paise Wasool Karna)
Jab courier company parcel deliver kar ke apne account mein paise bhejti hai:
- Staff **COD** tab mein jaata hai, aur us order ke aagay **"Receive COD"** par click karta hai.
- Is se Order ka status "Shipped" se **"Delivered"** ho jata hai, aur COD Status "Pending" se **"Received"** ho jata hai.
- Ye amount phir Dashboard pe "Received COD" mein show hone lagti hai.

---

## 6. Daily Closing & Settlements (Hisab Kitab)
- **Daily Closing:** Har din ke end par agent apne din ki karkardagi (performance) aur total amount check kar sakta hai ke aaj usne kitne orders process kiye.
- **Settlements:** Owner check kar sakta hai ke kis courier company se kitne paise lene wale baqi hain aur hisab clear kar sakta hai.

---

## 7. Activity Log (Nigrani / Tracking)
System har ek action ko record karta hai. Agar kisi ne order banaya, delete kiya, ya payment received ki, to **Activity Log** mein save ho jata hai ke:
*Kis time par, kis Agent (Sami ya Abid) ne, kon sa Order, kya update kiya.* 
Is se system mein mukammal shafafiyat (transparency) rehti hai aur koi ghalti nahi hoti.

---

**Khulasa (Summary):**
1. **Create Order** (Status: Pending) -> 2. **Add Tracking** (Status: Shipped) -> 3. **Receive COD** (Status: Delivered, COD: Received)

---

## 8. Future Roadmap (Aglay Steps)
Kyun ke yeh abhi sirf **Frontend** hai (jisme Mock Data use ho raha hai), is system ko mukammal live karne ke liye ye ahem steps baqi hain:

- **Backend & Database:** Node.js ya Python mein backend banana aur PostgreSQL/MySQL database lagana taake data hamesha ke liye save rahay.
- **Authentication (Login):** System ko secure karne ke liye admin aur staff ka login system (ID aur Password) banana.
- **Thermal Label Printing:** "Print Label" ke button ko asal 4x6 thermal printer ke sath connect karna aur direct PDF print nikalna.
- **WhatsApp API:** Jaise hi order "Shipped" ho, customer ko auto WhatsApp message bhejna ke "Aapka parcel nikal chuka hai, tracking number: XYZ".