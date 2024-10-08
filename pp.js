window.paypal
  .Buttons({
    async createOrder() {
      const container = document.querySelector("#result-message");
      container.innerHTML = '';
      let attendeeNames=[]
      for (let i = 1; i <= ticket_count.value; i++) {
        attendeeNames.push(document.getElementById(`attendee-name${i}`).value)
      }
      const quant=attendeeNames.length
      const phone = document.getElementById('phone-number').value;
      const email = document.getElementById('email').value;
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          // use the "body" param to optionally pass additional order information
          // like product ids and quantities
          body: JSON.stringify({
            product:
              {
                description: {attendeeNames,phone,email},
                quantity: quant,
              }
          }),
        });
        
        const orderData = await response.json();
        
        if (orderData.id) {
          return orderData.id;
        } else {
          // const errorDetail = orderData?.details?.[0];
          // const errorMessage = errorDetail
          //   ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
          //   : JSON.stringify(orderData);
          const errorMessage = orderData.error || "Unknown error occurred";
          
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error(error);
        resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`);
      }
    },
    async onApprove(data, actions) {
      try {
        const response = await fetch(`/api/orders/${data.orderID}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        
        const orderData = await response.json();
        // Three cases to handle:
        //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
        //   (2) Other non-recoverable errors -> Show a failure message
        //   (3) Successful transaction -> Show confirmation or thank you message
        
        const errorDetail = orderData?.details?.[0];
        
        if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
          // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
          // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
          errorDetail.description+="<br><br>There was an issue processing your payment. Please try again or use a different payment source."
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
          return actions.restart();
        } else if (errorDetail) {
          // (2) Other non-recoverable errors -> Show a failure message
          throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
        } else if (!orderData.purchase_units) {
          throw new Error(JSON.stringify(orderData));
        } else {
          // (3) Successful transaction -> Show confirmation or thank you message
          // Or go to another URL:  
          // actions.redirect('thanks?apple.html');
          const uuid=orderData.uuid
          window.location.href = `/thanks?id=${uuid}`
          // resultMessage(orderData,true,orderData.credit)
          // console.log(
          //   "Capture PP result",
          //   orderData,
          //   JSON.stringify(orderData, null, 2),
          // );
        }
      } catch (error) {
        console.error(error);
        resultMessage(
          `Sorry, your transaction could not be processed...<br><br>${error}`,
        );
      }
    },
  })
  .render("#paypal-button-container");
  
// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message,success=false,db=true) {
  if (success){
  }
  else{
    const container = document.querySelector("#result-message");
    const parent = container.parentNode;
    parent.insertBefore(container, document.getElementById('paypal-button-container'));
    container.style.color = "red";
    container.innerHTML = message;
  }
}