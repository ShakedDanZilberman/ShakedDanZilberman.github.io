// Define handlers for the events.
// A handler is an object with a name (string), filter (function: Event → Boolean), and handle (function: Event → None).

const handlers = [
    {
        name: "template",
        filter: event => false,
        handle: event => { console.log("Action on the event") }
    },
    // A handler for painting עע in pale red:
    {
        name: "self work",
        filter: event => ['עע', 'ע"ע', 'מקלחת', 'בליץ'].some(x => event.getTitle().startsWith(x)) && (event.isOwnedByMe() || event.getMyStatus().toString() == "YES"),
        handle: event => {
            event.setColor(CalendarApp.EventColor.PALE_RED);
        }
    },
    // A handler for painting meetings as pale blue:
    {
        name: "meetings",
        filter: event => {
            var title = event.getTitle();
            const ownedByMe = event.isOwnedByMe();
            const confirmed = event.getMyStatus().toString() == 'YES';
            const participationConfirmed = (!ownedByMe && confirmed) || ownedByMe;
            const numberOfInvitees = event.getGuestList(true).length;
            if (numberOfInvitees > 4) return true;

            const meetingPrefixes = ['פגישה', 'פגישת', 'פא', 'פע', 'מפגש', 'פ.א', 'פ.ע', 'פ"א', 'פ"ע', 'פעילוצ', 'פעילו"צ', 'פעילו"צ', 'פאע', 'פעא', 'פא/ע', 'פעידוצ', 'פעידו"צ', 'שיקוף', 'פתחש', 'פתח"ש', 'התנעה', 'התנעת', '[פ"א]', '[פ.א]', '[פ.ע]', '[פ"ע]', 'פורום', 'פ״א', 'פ״ע', 'תיאום ציפיות', "פ\"א/פ\"ע"];
            const meetingInfixes = ['הורדת תפקיד', 'ראיון', 'צוותי', 'שיקוף סקירה', 'שיקוף סוציומטרי', 'אישור תכניות', 'אישור תוכניות', 'אישור מתווה', 'הצגת תחקיר', 'התנעה', 'התנעת', "ראיונות"];

            for (let prefix of meetingPrefixes) {
                if (title.startsWith(prefix + ' '))
                    return participationConfirmed;
            }
            for (let infix of meetingInfixes) {
                if (title.includes(infix))
                    return participationConfirmed;
            }
            return false;
        },
        handle: event => event.setColor(CalendarApp.EventColor.PALE_BLUE)
    },
    // Handler for painting שגמח shifts as (dark) blue:
    {
        name: "guarding and cleaning shifts",
        filter: event => ['עלמש', 'עלמ"ש', 'שמירה', 'תורנות', 'כוננות', 'שמירת'].some(x => event.getTitle().includes(x)) || event.getCreators().includes("talpibotsystem@gmail.com"),
        handle: event => event.setColor(CalendarApp.EventColor.BLUE)
    },
    // Handler for painting academy-ish stuff in pale green:
    {
        name: "academy-ish",
        filter: event => ['חמל', 'חמ"ל', 'שעת קבלה', 'באולינג', 'באולינ"ג'].some(x => event.getTitle().startsWith(x)),
        handle: event => event.setColor(CalendarApp.EventColor.PALE_GREEN)
    },
    // (Unused) handler for moving events to a different calendar
    {
        name: "mover",
        filter: event => false,
        handle: event => {
            var otherCalendar = CalendarApp.getCalendarById('[INSERT CALENDAR ID HERE]@group.calendar.google.com');
            event.deleteEvent();
            otherCalendar.createEvent(event.getTitle(), event.getStartTime(), event.getEndTime()).setDescription(event.getDescription());
        }
    }
];


// Entry point when any event is changed (shortened, renamed, moved, etc.)
function onEventChanged(e) {
    console.log(e);
    const personalID = '[your.talpiot.mail]@gmail.com';

    // Scan all events in the calendar between yesterday and next week
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const next_week = new Date();
    next_week.setDate(now.getDate() + 7);

    console.log("From date:");
    console.log(yesterday);
    console.log("To date:");
    console.log(next_week);

    var personalCalendar = CalendarApp.getCalendarById(personalID);
    var personalEvents = personalCalendar.getEvents(yesterday, next_week);

    // Apply the handlers (if applicable) to all the events
    // (This is inefficient but enough for recolouring events)
    personalEvents.forEach(event => {
        for (let handler of handlers) {
            if (handler.filter(event)) {
                try {
                    handler.handle(event);
                } catch (err) {
                    console.log(err);
                }
                console.log(event.getTitle() + " to " + handler.name)
                break;
            }
        }
    });
}

function honeypot() { }