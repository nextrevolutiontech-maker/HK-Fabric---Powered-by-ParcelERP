# HK Fabric - Courier & COD Management System (Frontend Flow)

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

---
---

# PART 2: Master Architecture Report (v2.0 - Full-Stack)

*Neeche di gayi details ab system ke Naye Full-Stack Architecture (Database aur Backend) ko explain karti hain.*

## 1. Technical Architecture (The Stack)

Pehle yeh system sirf aik "Frontend Prototype" (Vite) tha, lekin ab isay **Enterprise-Grade Full-Stack Application** mein convert kar diya gaya hai.

- **Frontend & Backend Framework:** **Next.js 15 (App Router)**
  - *Kyun?* Is se humara Frontend aur Backend aik hi project mein rehta hai. Backend ke liye alag se Express.js bananay ki zaroorat nahi. Har API route aik "Serverless Function" ban jata hai jo Vercel par bohut fast aur globally scale hota hai.
- **UI & Styling:** **Tailwind CSS v4** aur **ShadCN UI**.
- **Database:** **PostgreSQL** (Development phase mein fast iteration ke liye SQLite `dev.db` use ho raha hai).
- **ORM (Object-Relational Mapper):** **Prisma**.
  - *Kyun?* Prisma database se baat karne ka sab se secure aur fast tareeqa hai. Isse SQL Injection ka khatra 0% rehta hai aur raw SQL queries nahi likhni parti.

---

## 2. Database Structure (Prisma Schema)

Database ko highly relational aur trackable banaya gaya hai. Sab se ahem tables yeh hain:

- **Customer:** Har customer unique WhatsApp number se pehchana jata hai. Is table mein customer ki `totalSpent`, aur `lastOrderDate` track hoti hai.
- **Order:** Main table. Isme `orderType` (COD/NON-COD), `advancePayment`, `paymentType` (Online/Courier), `status` aur `codStatus` save hotay hain. Har order ka ek unique `orderNo` hota hai.
- **OrderItem:** Aik order mein kitni bedsheets/items hain, unki price aur quantity yahan save hoti hai.
- **TrackingEntry:** Courier ka naam aur tracking number.
- **CodPayment & Settlement:** Courier se milne wali payments aur Excel sheet settlements ka record.
- **Activity (Audit Trail):** System mein jo bhi tabdeeli aati hai (jis ne bhi ki ho), wo is table mein date aur time ke sath mehfooz ho jati hai taake shafafiyat (transparency) rahay.

---

## 3. Next.js Folder Structure

Project ka backend aur frontend is tarah organized hai:

- `src/app/page.tsx`: Hamari main User Interface (Dashboard, Orders, Settings).
- `src/app/api/`: Hamare backend ke endpoints.
  - `/api/customers/route.ts`: Customers create aur fetch karne ka logic.
  - `/api/orders/route.ts`: Naye orders bananay aur edit karne ka logic.
- `src/lib/prisma.ts`: Database connection ko zinda (alive) rakhne wali global configuration file.
- `prisma/schema.prisma`: Wo file jismein humari database ki saari tables defined hain.

---

## 4. Security & Deployment

- **Hosting:** Is poore system ko **Vercel** par host kiya ja sakta hai.
- **Serverless Scaling:** Vercel automatically requests ko handle karega. Rozana 50 parcels hon ya 5,000, system crash nahi hoga.
- **API Security:** Humari Prisma database logic backend server par hai, isliye browser ya frontend user database tak directly access nahi kar sakta.