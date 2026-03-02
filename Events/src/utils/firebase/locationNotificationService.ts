import { db } from "../../database/kysely/databases";
import { sendNotification } from "./sendNotification";

interface EventData {
    id : number,
    name : string;
    address : string;
    venue?: string;
}

export const notifyAffiliatesByLocation = async (address: string, name: string, event: EventData)=>{
    try{
        if(!event.address){
            console.warn("Event address missing - skiping location notification");
            return;
        }

        const eventAddress = event.address.toLowerCase();

        const affiliates = await db
        .selectFrom("affiliates")
        .selectAll()
        .where("deleted","is not", true)
        .where("geography","is not",null)
        .execute();

        if(!affiliates.length){
            console.log("No affiliates found in database");
            return;
        }

        const matchedAffiliates = affiliates.filter((a)=>{
            const geo = a.geography?.toLowerCase()?.trim();
            if(!geo)
                return false;

            return eventAddress.includes(geo) || geo.includes(eventAddress);
        });

        if(!matchedAffiliates.length){
            console.log("No affiliates found for this event location:", event.address);
            return;
        }

        const title = "New Event Near You 🎉";
        const body = `A new event "${event.name}" is happening at ${event.venue}. Check it out!`;

        for(const affiliate of matchedAffiliates){
            if(affiliate.fcm_token){
                await sendNotification(affiliate.fcm_token , title ,body);
            }
        }

        console.log(`Notifications sent to affiliates in/near: ${event.address}`);
    } catch (error){
        console.error("Error in notifyAffiliatesByLocation:", error);
    }
};