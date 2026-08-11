// Longer-form persuasive copy shown on a legacy PDF guide's page,
// between the preview and the premium upsell. Keyed by guide slug,
// keeps this out of the database since it's editorial content edited
// here in code, not something admin needs a form for. Add an entry
// for a guide's slug to show it, guides with no entry render nothing.
export const GUIDE_SALES_COPY: Record<string, string> = {
  'sri-lanka-family-guide': `Sri Lanka wasn't a destination we rushed through and this isn't a guide that rushes you either.

This 47-page, photo-filled guide is an honest, experience-led companion for families wanting to explore Sri Lanka slowly, confidently, and thoughtfully. It's built from our own journey across the south coast, into the north, through ancient cities and up into the hill country, including the parts that surprised us, the parts we loved, and the parts we wish we'd researched better.

Inside, you'll find practical advice that actually matters when travelling with kids: what the WiFi is really like, how spicy the food actually is (very), where to withdraw cash without fees, what to expect from medical centres, how to deal with relentless mosquitoes, and whether renting a tuk-tuk is as chaotic as it sounds (spoiler: it was one of the best decisions we made).

We share:

- Why Weligama works so well as a south coast base
- How to choose a safari without contributing to unethical wildlife practices
- An honest account of visiting Pinnawala Elephant Orphanage
- Why the B35 road became one of our favourite wildlife experiences
- What each region felt like as a family - Kalpitiya, Wilpattu, Anuradhapura, Mannar, Jaffna, Sigiriya, Kandy and Ella
- What we'd do again, and what we wouldn't

This isn't a tick-list of 100 attractions. It's not a luxury hotel directory. And it's not written from a quick 10-day holiday.

It's for families who want to:

- Travel independently
- Move at a slower pace
- Make ethical choices
- Understand what Sri Lanka is really like beyond Instagram

Sri Lanka challenged us in the best ways. It welcomed our child everywhere. It made us rethink certain experiences. It rewarded flexibility and punished overplanning. And it reminded us that some of the best travel moments happen when you leave space for them.

If you're planning a trip, or even just considering one, this guide will help you travel Sri Lanka with clarity, confidence, and realistic expectations.

**Not perfectly.**
**But well.**`,
}
