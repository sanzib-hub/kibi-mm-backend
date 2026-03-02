import admin from "./firebase.js";

export const sendNotification = async(fcmToken: string , title:string, body: string) =>{
    const message ={
        notification :{
            title,
            body
        },
        token : fcmToken,
    };

    try{
        const response = await admin.messaging().send(message);
        console.log("Successfully sent message:", response);
        return response;
    }catch (error){
        console.error("Error sending message:",error);
        throw error;
    }
};  