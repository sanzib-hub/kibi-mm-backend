import Joi from "joi";


export const placeOrderSchema = Joi.object({
    eventId: Joi.number().required().label("Event ID"),
    team_id: Joi.number().optional().label("Team ID"),
  });

export const createOrderSchema = Joi.object({
    transaction_id: Joi.string().uuid().required(),
    amount:Joi.number().integer().min(1).required(),
    currency:Joi.string().length(3).uppercase().required(),
    organizationId: Joi.number().required(),
    eventId: Joi.number().required(),
    affiliate_id: Joi.number().required(),
    team_id: Joi.number().optional(),
});


export const generatePaymentSignatureSchema = Joi.object({
    razorpay_order_id:Joi.string().required(),
    razorpay_payment_id:Joi.string().required(),
    payment_status:Joi.string()
    .valid("captured","failed","pending")
    .required(),
});


export const orderStatusSchema = Joi.object({
    order_id :Joi.string().required(),
})

export const webhookHandlerSchema=Joi.object({
    event:Joi.string().valid("payment.captured","order.paid","refund.processed").required(),
    payload:Joi.object().required(),
}).unknown(true); 

