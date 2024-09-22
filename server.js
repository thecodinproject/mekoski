const express = require('express')
const app = express()
const { pool } = require("./dbConfig");
const {escapeLiteral} =require('pg');
const MailChecker=require('mailchecker')
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { count } = require('console');

const isProduction = process.env.NODE_ENV === "production";

const generateHexCode = (length) => crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);

//MIDDLEWARE
app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false}));
app.set('trust proxy', 1)



// app.use(passport.initialize());
// app.use(passport.session());

// app.use(flash());
app.use(express.json());

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname));/////////PUT ALL JS OTHER THAN SERVER.JS INTO PUBLIC FOLDER

const PORT = process.env.PORT || 4000;



///ROUTES
app.get('/', (req, res) => {
    res.render('index',{prod:isProduction})
})

app.get('/tickets', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT count(*) as row_count FROM tickets`
        );

        // Convert row_count to a number
        const rowCount = parseInt(result.rows[0].row_count, 10) || 0; // Default to 0 if NaN
        const ticket_count = Math.max(32 - rowCount, 0); // Ensure non-negative

        return res.status(200).json({ ticket_count }); // Send as JSON
    } catch (error) {
        console.error('Error getting ticket count:', error);
        return res.status(500).send('An internal server error occurred.');
    }
});

app.get('/thanks', (req, res) => {
    const id = req.query.id || null; // Get id from query or set to null
    res.render('thanks', { id }); // Pass id to EJS template
});

app.post('/getInfo', async (req, res) => {
    const uuid = req.body.uuid; // Access the UUID from the request body
    try {
        const result = await pool.query(
            `SELECT name, ticket_number FROM tickets WHERE uuid = $1`, [uuid]
        );
        
        if (result.rows.length > 0) {
            return res.json(result.rows); // Respond with the rows as JSON
        } else {
            return res.status(404).send('No tickets found for this ID.');
        }
    } catch (error) {
        console.error('Error getting ticket information:', error);
        return res.status(500).send('An internal server error occurred.');
    }
});

app.get('/admin', (req,res) => {
    res.render('admin');
})

app.post('/alltix', async (req, res) => {
    const { password } = req.body;

    // Check the password (replace 'your_admin_password' with your actual admin password)
    if (password === 'Eljoshyo2') {
        try {
            const result = await pool.query(
                `SELECT ticket_number,name,email,phone,paypal as paypal_id,method as payment_method,created,uuid as purchase_id FROM tickets 
                ORDER BY ticket_number ASC`);
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Database error');
        }
    } else {
        res.status(403).send('Forbidden: Incorrect password');
    }
});

app.post('/addtix',async (req,res) =>{
    const { password,name,email,phone,method } = req.body;
    // Check the password (replace 'your_admin_password' with your actual admin password)
    if (password === 'Eljoshyo2') {
        try {
            const result = await pool.query(
                `WITH  insert_ticket AS (
                    INSERT into tickets (name,email,phone,uuid,method)
                    SELECT $1,$2,$3,$4,$5)
                    SELECT ticket_number,name,email,phone,paypal as paypal_id,method as payment_method,created,uuid as purchase_id FROM tickets 
                ORDER BY ticket_number DESC `,
                [name,email,phone,generateHexCode(12)],method)
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Database error');
        }
    } else {
        res.status(403).send('Forbidden: Incorrect password');
    }
})

app.post('/deletetix', async (req, res) => {
    const { password, ticket_number } = req.body;
    // Check the password (replace 'your_admin_password' with your actual admin password)
    if (password === 'Eljoshyo2') {
        try {
            const result = await pool.query(
                `DELETE FROM tickets WHERE ticket_number=$1 RETURNING *`, // Returning all columns for better response
                [ticket_number]
            );
            if (result.rowCount > 0) {
                res.json({ success: true, ticket_number: ticket_number }); // Send back the deleted ticket number
            } else {
                res.status(404).send('Ticket not found');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Database error');
        }
    } else {
        res.status(403).send('Forbidden: Incorrect password');
    }
});

app.post('/updatetix', async (req, res) => {
    const { password, ticket_number, name, email, phone, method } = req.body; // Include all fields to be updated
    // Check the password (replace 'your_admin_password' with your actual admin password)
    if (password === 'Eljoshyo2') {
        try {
            const result = await pool.query(
                `UPDATE tickets SET name = $2, email = $3, phone = $4, method = $5 WHERE ticket_number=$1 RETURNING *`, // Returning all columns for better response
                [ticket_number, name, email, phone, method]
            );
            if (result.rowCount > 0) {
                res.json({ success: true, ticket: result.rows[0] }); // Send back the updated ticket
            } else {
                res.status(404).send('Ticket not found');
            }
        } catch (err) {
            console.error(err);
            res.status(500).send('Database error');
        }
    } else {
        res.status(403).send('Forbidden: Incorrect password');
    }
});

////ROUTES

////EMAIL
let transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: "serpaidnow@gmail.com", // generated brevo user
        pass: "TCAnUgFw0bkHYpaV", // generated brevo password
    },
});

async function sendEmail(email,subject,message) {
    try {
        await transporter.sendMail({
            from: 'MekoskiFundraiser <hgn.shelly@yahoo.com>', // sender address
            to: email.toString(), // list of receivers
            subject: subject, // Subject line
            html:`<!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="x-apple-disable-message-reformatting">
                <title>Mekoski Fundraiser</title>
            </head>
            <body style="margin:0; padding:0;">
                <center>
                    <div style="width:100%; max-width:600px;">
                        <header style="text-align: center; margin-bottom: 20px;">
                        </header>
                        <p style="font-size:16px; line-height:24px; color:#666666; margin-bottom:30px;">
                            ${message}
                        </p>
                    </div>
                </center>
            </body>
            </html>`
        });
        return { success: true };
    } catch (error) {
        console.error("Error sending email to:", email, error);
        return { success: false, error: "Failed to send email" };
    }
}
////EMAIL

function rowsToTable(rows) {
    if (rows.length === 0) return "<p>No purchase information available.</p>";

    let table = `<table style="width: 100%; border-collapse: collapse; margin-top: 20px;">`;
    table += `<thead><tr>`;
    // Get keys from the first row for headers
    const keys = Object.keys(rows[0]);
    keys.forEach(key => {
        table += `<th style="border: 1px solid #dddddd; padding: 8px; text-align: left;">${key}</th>`;
    });
    table += `</tr></thead><tbody>`;
    
    // Add each row to the table
    rows.forEach(row => {
        table += `<tr>`;
        keys.forEach(key => {
            table += `<td style="border: 1px solid #dddddd; padding: 8px;">${row[key]}</td>`;
        });
        table += `</tr>`;
    });
    table += `</tbody></table>`;
    return table;
}


/////PAYPAL SHIATSU
const base = isProduction ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"; 
const PAYPAL_CLIENT_ID = isProduction ? process.env.PAYPAL_CLIENT_ID : process.env.TRIAL_PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = isProduction ? process.env.PAYPAL_CLIENT_SECRET : process.env.TRIAL_PAYPAL_CLIENT_SECRET;


const generateAccessToken = async () => {
    try {
      if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        throw new Error("MISSING_API_CREDENTIALS");
      }
      const auth = Buffer.from(
        PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET,
      ).toString("base64");
      const response = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      
      const data = await response.json();
      //console.log(data.access_token)
      return data.access_token;
    } catch (error) {
      console.error("Failed to generate Access Token:", error);
    }
  };
    
  /**
  * Create an order to start the transaction.
  * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
  */
  const createOrder = async (cart) => {
    // use the cart information passed from the front-end to calculate the purchase unit details
    // console.log(
    //   "shopping cart information passed from the frontend createOrder() callback:",
    //   cart,
    // );
    
    let quant=parseInt(cart.quantity).toFixed(0);
   
    const data=cart.description
    cost=quant*42
    // if (quant<tiers[1]){ return { jsonResponse: { error: `Quantity must be more than ${tiers[1]}; Currently ${quant}` }, httpStatusCode: 400 }}
    // if (quant> tiers[9]){return { jsonResponse: { error: `Quantity must be less than ${tiers[9]}; Currently ${quant}` }, httpStatusCode: 400 }}

    return new Promise(async (resolve, reject) => {
        try {
            const names = !data.attendeeNames.some(name => name.trim() === "");
            if (!data.email || !data.phone || !names) {return reject(new Error("Please enter all info: Name(s), number, email"))}
            else if (!(!data.attendeeNames.some(name => name.length < 2))){return reject(new Error("Name(s) must be at least 2 characters long"))}
            else if (data.attendeeNames.some(name => /\d/.test(name))){return reject(new Error("Invalid names(s). Numbers are not Allowed."))}
            // Initialize order in purchases table
            const uuid = generateHexCode(12);
            const attendeeNames = data.attendeeNames; // assuming this is an array
            const tempTicketsValues = [];

            // Dynamically build the temp_tickets values
            attendeeNames.forEach((name, index) => {
                const placeholderIndex = index + 6; // Start from $5 for names
                tempTicketsValues.push(`($1, $4, $5, $${placeholderIndex})`);
            });

            // Construct the full INSERT query for temp_tickets
            const tempTicketsQuery = `
                INSERT INTO temp_tickets (uuid, phone, email, name)
                VALUES ${tempTicketsValues.join(', ')}
            `;

            // Combine the queries
            const query = `
                WITH insert_tix AS (
                    ${tempTicketsQuery}
                )
                INSERT INTO purchases (uuid, quantity, cost, phone, email)
                SELECT $1, $2, $3::numeric, $4, $5
                RETURNING id
            `;


            function convertTo10DigitNumber(phoneNumber) {
                // Remove non-digit characters
                let cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
            
                // Remove leading '1' if present
                if (cleanedNumber.startsWith('1')) {
                    cleanedNumber = cleanedNumber.slice(1);
                }
            
                // Check if it is exactly 10 digits
                if (cleanedNumber.length === 10) {
                    return cleanedNumber;
                } else {
                    throw new Error('Input must contain exactly 10 digits after cleaning.');
                }
            }

            function isValidEmail(email) {
                // Regular expression for validating an email address
                const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
                // Check if the email matches the pattern
                if (!emailPattern.test(email)) {
                    throw new Error('Invalid email format.');
                }
                return true; // Return true if valid
            }

            let number
            try {
                number = convertTo10DigitNumber(data.phone);
            } catch (error) {
                return reject(new Error("Invalid phone number."));
            }


            try {
                isValidEmail(data.email);
            } catch (error) {
                return reject(new Error("Invalid email."));
            }


            // Prepare the values array
            const values = [uuid, quant, cost, number, data.email];


            attendeeNames.forEach(name => {
                values.push(name);
            });

            // // Log final values for debugging
            // console.log("Final query:", query);
            // console.log("Final values array:", values);
            
            const { rows } = await pool.query(query, values);

            
            if (!rows || !rows.length) {
                return reject(new Error("Unable to access ticket database at this time."));
            }
            
            const id = rows[0].id;

            ////Check if tickets available!!
            await pool.query(
                `
                WITH ticket_count AS (
                    SELECT COUNT(*) AS count FROM temp_tickets WHERE uuid = $1
                ),
                existing_ticket_count AS (
                    SELECT COUNT(*) AS count FROM tickets
                )
                SELECT 
                    (SELECT count FROM ticket_count) + (SELECT count FROM existing_ticket_count) AS total_count
                `,
                [uuid],
                (error, countResults) => {
                    if (error) {
                        console.error('Error counting tickets', error);
                        return reject(new Error('An internal server error occurred.'));
                    }
                    const totalCount = countResults?.rows[0]?.total_count || 0;
                    if (totalCount > 32) {
                        return reject(new Error('There are not enough tickets available! Please lower the amount or contact us.') );
                    }
                }
            )
            
            // Generate access token
            const accessToken = await generateAccessToken();
            
            // Prepare payload for PayPal request
            const url = `${base}/v2/checkout/orders`;
            const payload = {
                intent: "CAPTURE",
                purchase_units: [
                    {
                        reference_id: id,
                        amount: {
                            currency_code: "USD",
                            value: cost,
                            breakdown: {
                                item_total: {
                                    currency_code: "USD",
                                    value: cost
                                }
                            }
                        },
                        items: [
                            {
                                name:quant + "x Tickets for Mekoski Fundraiser",
                                description: "Wine Tasting Fundraiser Event for Terence Mekoski",
                                sku: quant,
                                unit_amount: {
                                    currency_code: "USD",
                                    value: cost,
                                },
                                quantity: 1
                            },
                        ]
                    },
                ],
                application_context: {
                    shipping_preference: 'NO_SHIPPING'
                },
            };

            // Make request to PayPal
            const response = await fetch(url, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                    // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
                    // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
                    // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
                    // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
                    // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
                },
                method: "POST",
                body: JSON.stringify(payload),
            });

            // Handle response from PayPal
            const res = await handleResponse(response);

            if (!response.ok) {
            throw new Error(res.jsonResponse.message);
            }
            // Update order status in purchases table
            await pool.query(
                'UPDATE purchases SET status=1, temp_id = $1 WHERE id= $2',/////Updated order to CREATED and adds temp_id
                [res.jsonResponse.id, id]
            );

            resolve(res);
        } catch (error) {
            console.error('Error in Paypal createOrder:', error);
            reject(error);
        }
    });
  };
    
  /**
  * Capture payment for the created order to complete the transaction.
  * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
  */
  const captureOrder = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}/capture`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
        // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
        // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
        // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
      },
    });

    
    return handleResponse(response);
  };
    
async function handleResponse(response) {
    try {
      const jsonResponse = await response.json();
      //console.log(response.status)
      return {
        jsonResponse,
        httpStatusCode: response.status,
      };
    } catch (err) {
      const errorMessage = await response.text();
      throw new Error(errorMessage);
    }
  }
    
app.post("/api/orders", async (req, res) => {
    try {
        // use the cart information passed from the front-end to calculate the order amount detals
        const { product } = req.body;
        const { jsonResponse, httpStatusCode } = await createOrder(product);
        // //console.log("apiCreated",jsonResponse)
        res.status(httpStatusCode).json(jsonResponse);
    } catch (err) {
        // console.error("Failed to create paypal order (/api/orders):", err);
        res.status(500).json({ error: err.message });
    }
  });
    
  app.post("/api/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;

        // Update order to ACCEPTED and get the result
        const result = await pool.query(
            `UPDATE purchases SET status=2 WHERE temp_id=$1 RETURNING id, quantity, cost, email, phone, uuid`,
            [orderID]
        );

        if (result?.rows?.length) {
            // const { id: purchaseID, quantity: quant, cost, phone, email, uuid } = result.rows[0];
            const purchaseID=result.rows[0].id;
            const quant=result.rows[0].id;
            const cost=result.rows[0].cost;
            const email=result.rows[0].email;
            const uuid=result.rows[0].uuid

            // Check if tickets are available
            const countResults = await pool.query(
                `
                WITH ticket_count AS (
                    SELECT COUNT(*) AS count FROM temp_tickets WHERE uuid = $1
                ),
                existing_ticket_count AS (
                    SELECT COUNT(*) AS count FROM tickets
                )
                SELECT 
                    (SELECT count FROM ticket_count) + (SELECT count FROM existing_ticket_count) AS total_count
                `,
                [uuid]
            );

            const totalCount = countResults?.rows[0]?.total_count || 0;
            if (totalCount > 32) {
                return res.status(400).json({ error: 'There are not enough tickets available! Please lower the amount or contact us.' });
            }

            const { jsonResponse, httpStatusCode } = await captureOrder(orderID);
            jsonResponse.quantity = quant; 
            jsonResponse.cost = cost; 
            jsonResponse.purchaseID = purchaseID; 
            jsonResponse.uuid = uuid;
            const trans_id = jsonResponse.purchase_units[0].payments.captures[0].id;

            if (httpStatusCode >= 400) {
                const errorMessage = jsonResponse.details?.[0]?.description || jsonResponse.message || 'An error occurred while processing your request.';
                return res.status(httpStatusCode).json({ error: errorMessage });
            }

            // Update order to CAPTURED, add trans_id to order, and add tickets
            const finalResults = await pool.query(
                `
                WITH update_purchase AS (
                    UPDATE purchases
                    SET status = 3, trans_id = $1
                    WHERE temp_id = $2 
                    RETURNING uuid
                )
                INSERT INTO tickets (name, email, phone, uuid, paypal,method)
                SELECT name, email, phone, temp_tickets.uuid, $3, $4
                FROM temp_tickets, update_purchase 
                WHERE temp_tickets.uuid = update_purchase.uuid 
                RETURNING name, ticket_number
                `,
                [trans_id, orderID, trans_id,'paypal']
            );

            if (finalResults?.rows.length === 0) {
                console.error('Error executing paypal final trans query', uuid);
                await sendEmail(email, `Mekoski Wine Tasking Fundraiser-Purchase ${uuid} is Pending`,
                    `We have received your Payment for Purchase ${uuid}.
                    <br>It is currently pending and will be processed within the next few hours.<br>
                    <br>You will receive an email when it has been processed!`
                );
                return; // Stop further execution
            } else {
                // Send success response
                res.status(httpStatusCode).json(jsonResponse);
                
                // Format results.rows into an HTML table
                const purchaseInfoTable = rowsToTable(finalResults.rows);

                await sendEmail(email, `Mekoski Wine Tasking Fundraiser`, `Thank you for supporting Terence Mekoski for Macomb County Sheriff! <br>
                    Here is your event purchase info:<br>
                    Purchase ID: ${uuid}.<br>
                    ${purchaseInfoTable}<br>
                    We hope you have a good time at the fundraiser and enjoy the wines! <br>
                    See you on October 17, Thursday at 6:30pm.<br>
                    Filipo Marc Winery <br>
                    39085 Garfield Rd<br>
                    Clinton Twp, MI 48038
                    `);
                await sendEmail('hgn.shelly@yahoo.com', `New Mekoski Ticket Purchase!`, `
                    Here is the event purchase info:<br>
                    Purchase ID: ${uuid}.<br>
                    ${purchaseInfoTable}<br>
                    `);
                return; // Ensure no further responses are sent
            }
        } else {
            return res.status(404).send('Order not found.');
        }
    } catch (error) {
        console.error("Failed to create paypal order (/api/orders/:orderID/capture):", error);
        return res.status(500).json({ error: error });
    }
});
/////PAYPAL SHIATSU


////END
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}` )
});

app.use((req, res) => {
    res.status(404).render('404');
});