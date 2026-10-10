const express = require("express");
const path = require("path");
const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let events = [
  { id: "EVT-1001", name: "Dilli Diwali Mela", category: "Festival", date: "2026-10-20", location: "Pragati Maidan, Delhi", price: 1500, seatsAvailable: 5465, featured: true, image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=85", description: "A vibrant celebration of lights, food, music and culture." },
  { id: "EVT-1002", name: "Hollywood Monsoon Night", category: "Concert", date: "2026-10-24", location: "Dome, NSCI SVP Stadium, Mumbai", price: 1500, seatsAvailable: 2772, featured: true, image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85", description: "A high-energy live music night with immersive lights and sound." },
  { id: "EVT-1003", name: "World Tech Summit", category: "Conference", date: "2026-11-05", location: "HITEX, Hyderabad", price: 2500, seatsAvailable: 9, featured: true, image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=85", description: "Ideas, products and people shaping the next wave of technology." },
  { id: "EVT-1004", name: "Indie Makers Meetup", category: "Conference", date: "2026-11-18", location: "Bengaluru International Centre, Bengaluru", price: 800, seatsAvailable: 120, featured: false, image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1000&q=85", description: "Meet builders, share ideas and discover practical ways to ship better products." },
  { id: "EVT-1005", name: "City Lights Comedy Live", category: "Concert", date: "2026-12-02", location: "Phoenix Marketcity, Bengaluru", price: 1200, seatsAvailable: 75, featured: false, image: "https://images.unsplash.com/photo-1524365323096-9f1f5a1c2b12?auto=format&fit=crop&w=1000&q=85", description: "An evening of stand-up, stories and unexpected punchlines." }
];
let users = [{id:"USR-1001", name:"Demo User", email:"demo@eventhub.test", password:"Demo@123", role:"user"}];
let bookings = [];
const safeUser = u => u ? ({id:u.id,name:u.name,email:u.email,role:u.role}) : null;
const makeId = prefix => `${prefix}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

app.get("/api/health", (req,res) => res.json({status:"ok", service:"EventHub API", timestamp:new Date().toISOString()}));
app.get("/api/events", (req,res) => {
  let result = [...events];
  const q = (req.query.q || "").toLowerCase();
  if(q) result = result.filter(e => `${e.name} ${e.category} ${e.location}`.toLowerCase().includes(q));
  if(req.query.category && req.query.category !== "All") result = result.filter(e => e.category === req.query.category);
  if(req.query.featured === "true") result = result.filter(e => e.featured);
  res.json({count:result.length, events:result});
});
app.get("/api/events/:id", (req,res) => {
  const event = events.find(e=>e.id===req.params.id);
  if(!event) return res.status(404).json({error:"Event not found"});
  res.json(event);
});
app.post("/api/auth/register", (req,res) => {
  const {name,email,password} = req.body || {};
  if(!name || !email || !password) return res.status(400).json({error:"Name, email and password are required"});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({error:"Enter a valid email address"});
  if(password.length < 8) return res.status(400).json({error:"Password must contain at least 8 characters"});
  if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) return res.status(409).json({error:"An account with this email already exists"});
  const user={id:makeId("USR"),name,email,password,role:"user"}; users.push(user);
  res.status(201).json({message:"Account created",user:safeUser(user)});
});
app.post("/api/auth/login", (req,res) => {
  const {email,password} = req.body || {};
  if(!email || !password) return res.status(400).json({error:"Email and password are required"});
  const user=users.find(u=>u.email.toLowerCase()===String(email).toLowerCase() && u.password===password);
  if(!user) return res.status(401).json({error:"Email or password is incorrect"});
  res.json({message:"Signed in",user:safeUser(user)});
});
app.get("/api/bookings", (req,res) => {
  const email=(req.query.email || "").toLowerCase();
  const result=email ? bookings.filter(b=>b.email.toLowerCase()===email) : bookings;
  res.json({count:result.length,bookings:result});
});
app.post("/api/bookings", (req,res) => {
  const {eventId,email,name,quantity} = req.body || {};
  const qty=Number(quantity);
  if(!eventId || !email || !name || !Number.isInteger(qty) || qty<1 || qty>10) return res.status(400).json({error:"Provide eventId, name, valid email and quantity from 1 to 10"});
  const event=events.find(e=>e.id===eventId);
  if(!event) return res.status(404).json({error:"Event not found"});
  if(event.seatsAvailable<qty) return res.status(409).json({error:"Not enough seats available", seatsAvailable:event.seatsAvailable});
  event.seatsAvailable-=qty;
  const booking={id:makeId("BK"),eventId:event.id,eventName:event.name,email,name,quantity:qty,unitPrice:event.price,total:event.price*qty,status:"Confirmed",createdAt:new Date().toISOString()};
  bookings.unshift(booking);
  res.status(201).json({message:"Booking confirmed",booking});
});
app.patch("/api/bookings/:id/cancel", (req,res) => {
  const booking=bookings.find(b=>b.id===req.params.id);
  if(!booking) return res.status(404).json({error:"Booking not found"});
  if(booking.status==="Cancelled") return res.status(409).json({error:"Booking is already cancelled"});
  const event=events.find(e=>e.id===booking.eventId);
  if(event) event.seatsAvailable+=booking.quantity;
  booking.status="Cancelled";
  res.json({message:"Booking cancelled",booking});
});
app.post("/api/admin/events", (req,res) => {
  const {name,category,date,location,price,seatsAvailable,image,description}=req.body || {};
  if(!name || !category || !date || !location || !Number.isFinite(Number(price)) || Number(price)<0 || !Number.isInteger(Number(seatsAvailable)) || Number(seatsAvailable)<0)
    return res.status(400).json({error:"Name, category, date, location, non-negative price and whole-number seats are required"});
  const event={id:makeId("EVT"),name,category,date,location,price:Number(price),seatsAvailable:Number(seatsAvailable),featured:false,image:image || "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=85",description:description || "A memorable live experience."};
  events.push(event); res.status(201).json({message:"Event created",event});
});
app.patch("/api/admin/events/:id", (req,res) => {
  const event=events.find(e=>e.id===req.params.id);
  if(!event) return res.status(404).json({error:"Event not found"});
  const allowed=["name","category","date","location","price","seatsAvailable","featured","description","image"];
  for(const key of allowed) if(req.body && req.body[key]!==undefined) event[key]=["price","seatsAvailable"].includes(key)?Number(req.body[key]):req.body[key];
  res.json({message:"Event updated",event});
});
app.delete("/api/admin/events/:id", (req,res) => {
  const index=events.findIndex(e=>e.id===req.params.id);
  if(index<0) return res.status(404).json({error:"Event not found"});
  const [deleted]=events.splice(index,1); res.json({message:"Event deleted",event:deleted});
});
app.get("/api/admin/summary", (req,res) => res.json({totalEvents:events.length,totalBookings:bookings.length,confirmedBookings:bookings.filter(b=>b.status==="Confirmed").length,cancelledBookings:bookings.filter(b=>b.status==="Cancelled").length,revenue:bookings.filter(b=>b.status==="Confirmed").reduce((s,b)=>s+b.total,0),totalSeatsAvailable:events.reduce((s,e)=>s+e.seatsAvailable,0)}));
app.get("*", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));
app.listen(PORT,()=>console.log(`EventHub running at http://localhost:${PORT}`));
