function FlowAutomailForTesting() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Sheet1");
  const data = sheet.getDataRange().getValues();
  const today = new Date();

  const fullEmailBody = `
    <p>Hi {{Name}},</p>
    <p>Hope you’re doing well.</p>
    <p>I’m reaching out to introduce <strong>Flow Supply Chain</strong>, one of India’s most reliable 3PL partners—trusted by brands like <strong>Godrej, Britannia, Maruti Suzuki, Kodak</strong>.</p>
    <p>Founded by the former <strong>promoter of Gati Ltd.</strong> and led by a CEO with 25+ years in the industry, we bring measurable impact on cost, efficiency, and operations.</p>
    <p>We manage over <strong>1 million sq. ft.</strong> of warehousing space, <strong>with ready-to-move Grade A 3PL warehouses available in NCR (Delhi) and Bhiwandi (Mumbai region)</strong>—two of India’s most strategic logistics hubs. We're also expanding to <strong>Bangalore, Chennai, Pune, and Hyderabad.<strong></p>
    <p>Would love to discuss your logistics needs.</p>
    <p>Thanks & Regards,<br>Vaibhav Kasar<br>IT Manager<br>9653250886</p>
    <p><img src="https://flowsc.in/images/logo.png" alt="Flow Logo" width="150"></p>
  `;

  const reminderBody = `
    <p>Hi {{Name}},</p>
    <p><strong>This is a gentle follow-up regarding our previous email.</strong></p>
    <p>We'd still love to connect about your logistics needs. Please let us know a suitable time.</p>
    <p>Thanks & Regards,<br>Vaibhav Kasar<br>IT Manager<br>9653250886</p>
    <p><img src="https://flowsc.in/images/logo.png" alt="Flow Logo" width="150"></p>
  `;

  for (let i = 1; i < data.length; i++) {
    let name = data[i][0];
    let email = data[i][1].trim();
    let nextSendDate = new Date(data[i][3]);
    let status = data[i][4];
    let threadId = data[i][6]; // Column G for Thread ID

    if (!isValidEmail(email)) {
      Logger.log("Invalid email address: " + email);
      sheet.getRange(i + 1, 6).setValue("Invalid Email");
      continue;
    }

    if (today >= nextSendDate) {
      let count = 1;
      if (status && status.startsWith("Sent(")) {
        const match = status.match(/Sent\((\d+)\)/);
        if (match && match[1]) {
          count = parseInt(match[1], 10) + 1;
        }
      }

      let subject = "Flow Supply Chain – Grade A 3PL Warehousing";
      let template = count === 1 ? fullEmailBody : reminderBody;
      let htmlBody = template.replace('{{Name}}', name);

      try {
        if (count === 1) {
          // Send the initial email
          GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
          Utilities.sleep(3000); // Wait for Gmail to process the sent email

          // Find the thread to get the threadId
          const threads = GmailApp.search(`to:${email} subject:"${subject}" newer_than:1m`);
          if (threads.length > 0) {
            sheet.getRange(i + 1, 7).setValue(threads[0].getId());
          } else {
            sheet.getRange(i + 1, 6).setValue("Error: Could not find thread ID.");
          }
        } else {
          // Send a reminder as a threaded reply using the Gmail API
          if (threadId) {
            const thread = GmailApp.getThreadById(threadId);
            if (thread) {
              const originalSubject = thread.getMessages()[0].getSubject();
              const lastMessage = thread.getMessages()[thread.getMessages().length - 1];
              const messageIdHeader = lastMessage.getHeader("Message-ID"); // Get the correct header for threading
              
              sendThreadedReply(email, originalSubject, htmlBody, threadId, messageIdHeader);
            } else {
              sheet.getRange(i + 1, 6).setValue("Error: Invalid Thread ID. Sent new email instead.");
              GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
            }
          } else {
            sheet.getRange(i + 1, 6).setValue("Error: No Thread ID found. Sent new email instead.");
            GmailApp.sendEmail(email, subject, '', { htmlBody: htmlBody });
          }
        }

        // Update sheet with new status and dates
        sheet.getRange(i + 1, 3).setValue(today); // Update Last Sent Date
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + 2); // Set next reminder for 2 days later
        sheet.getRange(i + 1, 4).setValue(nextDate); // Update Next Send Date
        sheet.getRange(i + 1, 5).setValue(`Sent(${count})`); // Update Status
        sheet.getRange(i + 1, 6).clearContent(); // Clear old errors

      } catch (e) {
        Logger.log(`Error sending to ${email}: ${e.message}`);
        sheet.getRange(i + 1, 6).setValue("Error: " + e.message);
      }
    }
  }
}

/**
 * Sends a threaded reply using the Gmail API, ensuring correct recipient and threading.
 */
function sendThreadedReply(recipient, originalSubject, htmlBody, threadId, messageIdHeader) {
  const subject = originalSubject.startsWith("Re: ") ? originalSubject : "Re: " + originalSubject;

  const rawMessage = [
    `To: ${recipient}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${messageIdHeader}`,
    `References: ${messageIdHeader}`,
    "Content-Type: text/html; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    htmlBody
  ].join("\n");

  const encodedMessage = Utilities.base64EncodeWebSafe(rawMessage);

  Gmail.Users.Messages.send({
    raw: encodedMessage,
    threadId: threadId,
  }, 'me');
}

function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}
