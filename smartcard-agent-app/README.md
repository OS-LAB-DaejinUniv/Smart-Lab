smartcard-agent-app
===

Overview
---
Smart card agent app for members of the OS lab., Daejin University.

With this app, users can scan their own ID card using their phone.
And lookup information of their card (card number, name, student number, etc..) including usage history.
Also users can read and modify extra configuration area located on card.

What is "Extra Configuration Area"?
---
Extra configuration is 16-byte of area which is freely read and written by the user without any authentication.
This data is transferred everytime when user tags their card to the wallpad.

* This area is currently used as information to determine which function the wallpad will execute when a user tags a card on the wallpad.

Status
---
Just a few lines of code to check NFC functionality
and APDU communication on flutter, for now..

Currently working
---
1. Users can read their ID card.
2. Users can lookup the card information.

To-do list
---
...to be added. 