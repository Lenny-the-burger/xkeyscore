
===== cadence-readme page 1 =====
CONFIDENTIAL//S!

(U/FOUO) CADENCE
Read Me

(U) Overview

(C//SI) CADENCE is a strong selection tasking tool dating back to the days of telegraphy. In the world of
telegraphy, only the textual content of the communications was intercepted. CADENCE's role was to
assign categories to the text and then forward the data for a given category. CADENCE, in combination
with software selection tools, is still used today by many Digital Network Intelligence (DNI) systems.

(U//FOUO) XKEYSCORE can be configured to ingest CADENCE dictionaries, and provide high-speed
content filtering, selection, and forwarding capabilities.

(C//S!) The CADENCE system fully automates the Front-End Dictionary Management process to filter and
select intelligence. Dictionary managers and target analysts can electronically submit, review, and
forward dictionary updates to scan traffic for keywords, to execute category rules and to define Boolean
and positional equations of keywords. Receipts for these requests are automatically generated, statistics
are compiled and reported, and approved updates are maintained in a database containing historical
information for the DDO review of "USSID-18" compliance.

(U//FOUO) Configuring XKEYSCORE for CADENCE can be accomplished in three steps. First, you must
complete a pre-configuration set-up process. Next you will configure xks.config to enable CADENCE

tasking and appropriate MAILORDER routing. Last, you will execute additional set-up processes:

(U) Pre-Configuration Set-Up
(U//FOUO) Follow these steps before configuring XKEYSCORE for CADENCE:

1. (U//FOUO) To submit a new Data Management Requirement (DMR), in your browser, go to:

a 301/33 mi4/s3m141 /index.php?content=dataManagement

and follow steps 1-3 for submitting a new DMR.

1 |

CONFIDENTIAL//S!

===== cadence-readme page 2 =====
CONFIDENTIAL//S!

2. (U//FOUO) Create a MAILORDER ticket to set-up the pick-up directory for your Master

XKEYSCORE server:

a. Type go mailorder inthe URL field of a browser on a high-side computer.

b. Click on the yellow PATHMASTER Remedy Ticket button near the top right of
the screen. The Remedy Ticket Submission screen will appear. In the bottom half of the
screen are two regions each containing a yellow Submit Remedy Ticket button.

c. Inthe bottom half of the Remedy Ticket Submission screen is two yellow Submit
Remedy Ticket buttons. Click the top button of the two. (This ticket pertains to New
Data-Flow). The ITSC login screen will appear.

d. Enter the SID of your alternate POC and then click Continue. A screen containing
contact information for you and your POC will appear.

e. Add/Edit the contact information as appropriate and then click Continue to go to the
Data transport service screen.

f. Click Dataflow request andthenclick Continue. The Request for New Data Flow
on an Existing Transport System screen will appear.

g. Enter as much information as you can. In the Data Flow Change Description field,
specifically indicate that the drop-off directory should be:

/export/data/xkeyscore/inputs/mailorder
h. Click Submit. You will receive a confirmation e-mail indicating the ticket has been

received, and more information may be requested before the ticket can be completed.
The overall process might take anywhere from a few days to a week to complete.

3. Repeat step 2 to create a MAILORDER ticket to set-up the pick-up directory for your Master
XKEYSCORE server. In this case, in step g, specifically indicate that the pick-up directory should
be: /export/data/xkeyscore/outputs/mailorder.

4. (U//FOUO) After you receive an approved response back for your DMR, send an e-mail message

[ii to start receiving CADENCE tasking.

2 |

CONFIDENTIAL//S!

===== cadence-readme page 3 =====
CONFIDENTIAL//S!

(U//FOUO) Configuring xks.config

1.

2.

3.

4.

(U//FOUO) Log on as the user oper.

(U//FOUO) At the command line from within any directory, type viconfig and then press
Enter. The xks.config file will open. Set the following four CADENCE configurations:

a. cadence = yes: This enables CADENCE tasking. The default setting for this
configuration is no. This entry is what creates the cadence_tasking_proc process, after
xks setup processes is run.

Note: |\f you enable CADENCE, then you must set up MAILORDER inputs for
CADENCE to go into inputs /cadence. (See step 2d below.)

b. site fdi = XXX: This is the identifying trigraph assigned toa particular system that is
embedded inside a response message so CADENCE can determine which system sent a
response. The cadence tasking proc option uses this fdi. XXX is the default.
(See Additional Processes, Step 4.)

c. mailorder = yes: This enables the mailorder_proc process. Its defaultis no.

d. mailorder input[0] =source:00:TY,dir:cadence

This re-directs all incoming files that have a PDDG of OO and a source system digraph of
TY from SXSCORE_DATA_DIR /inputs/mailorder to SXSCORE_DATA_DIR/inputs/cadence.

(U//FOUO) In the #{dictionaries} section of xks.config, below the line “dictionary[] =
PLACEHOLDER — DO NOT REMOVE — ADD ENTRIES BELOW”, type:

dictionary[O] = type=cadence

(U//FOUO) This setting indicates that all tasking should be pulled locally from
SXSCORE_DATA_DIR/dictionaries/cadence/dicts and.../fists. This will use the fist links file
that was delivered by CADENCE for mapping the dictionary: fist table andcan be
found in SXKSCORE_DATA_DIR/dictionaries/cadence.

(U//FOUO) When the xks update_dictionaries process runs as a cronjob, then it knows
automatically to pull the updates from these directories.

Note: (U//FOUO ) CADENCE dictionaries must end with .netlayerand fist tables
must endwith .fist.

(U//FOUO) Type : wo! and then press Enter to exit xks.config.

3 |

CONFIDENTIAL//S!

===== cadence-readme page 4 =====
CONFIDENTIAL//S!

Additional Processes

(U//FOUO) After editing CADENCE configurations in xks.config, it is time to run some set-up
processes.

1.

(U//FOUO) At the command prompt, type xks setup processes and press Enter. When
cadence=yes in xks.config, this creates cadence tasking proc. And, if

mailorder=yes, it willalso create the check mailorder site.phpand
mailorder proc processes.

(U//FOUO) At the command prompt, type xks proc start andpress Enter. This starts
any processes that were created instep 1, cadence tasking proc, mailorder proc
and check mailorder site. php.

(U//FOUO) Ifa MAILORDER input rule is changed in xks.config, then type xks proc
restart cms torestartthe check mailorder site.php process.

Note: (U//FOUQ) The xks update_dictionaries cronjob will run once an hour. It reads the
dictionaries section of the SXSCORE_DIR/config/xks.config file and copies the dictionaries and
fists from SXSCORE_DATA_DIR/dictionaries/cadence/dicts and ../fists to
SXSCORE_DIR/config/dictionaries/cadence. This is where the process_data_parent’s (i-e., the
XKS processes that load dictionaries and do the selection, scanning and forwarding) actually load
their dictionaries from.

4 |

CONFIDENTIAL//S!
