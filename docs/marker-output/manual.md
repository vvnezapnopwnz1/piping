Document Type Serial No. Rev. 

Activity Unit **14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0001-03.png)


Page 

## **CMC – Construction Method Center** 

**1 / 156** 

## **Easy Piping User Manual** 

Modifications subject of this revision concern the following pages: 

|1|18/12/13|T.Shyam Kumar|-|-|Version 4.7.3|
|---|---|---|---|---|---|
|0|09/10/13|T.Shyam Kumar|W.WEBERRUSS|B.BARBARIN|Version 4.7.0|
|Rev|DATE<br>DD/MM/YY|WRITTEN BY<br>(name & visa)|CHECKED BY<br>(name & visa)|APPROVED BY<br>(name & visa)|STATUS|
||||DOCUMENT REVISIONS|||



Sections changed in last revision are identified by a line in the right margin 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **2 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0002-02.png)


## **CMC – Construction Method Center** 

## Easy Piping 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0002-05.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0002-06.png)


## User Manual Version 4.7.3 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0002-08.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0003-01.png)


## **CMC – Construction Method Center** 

Page **3 / 156** 

## **CONTENTS** 

||**CONTENTS**|**CONTENTS**|
|---|---|---|
|1.|PROJECT DEFINITION ........................................................................................ 9||
||1.1|Add New Project .............................................................................................. 9|
||1.2|List of available projects ................................................................................. 13|
|2.|SYSTEM REFERENTIAL .................................................................................... 14||
||2.1|Material Type ................................................................................................. 14|
||2.2|Film Quantity per Diameter ............................................................................ 15|
||2.3|UT Calculation ............................................................................................... 15|
||2.4|Torquing requirement ..................................................................................... 16|
|3.|PROJECT REFERENTIAL .................................................................................. 17||
||3.1|Subcontractor List .......................................................................................... 18|
||3.2|Progress Weight Factor ................................................................................. 19|
||3.3|Area Classification ......................................................................................... 20|
||3.4|PDS Area/Subcontractor ................................................................................ 21|
||3.5|WPS List ........................................................................................................ 22|
||3.6|Welder Qualification ....................................................................................... 23|
||3.7|Service class/Material type............................................................................. 24|
||3.8|Weld type List ................................................................................................ 25|
||3.9|NDE Matrix .................................................................................................... 25|
||3.10|Rework Code ................................................................................................. 26|
||3.11|Thickness ....................................................................................................... 27|
||3.12|Project Piping Material Class ......................................................................... 28|
||3.13|Joint Category Definition ................................................................................ 29|
||3.14|Unit of time reference ..................................................................................... 30|
||3.15|Jointer List ..................................................................................................... 31|
||3.16|Blinding Team ................................................................................................ 32|
||3.17|Finishing Team .............................................................................................. 33|
||3.18|Reinstatement Team ...................................................................................... 34|
||3.19|System ........................................................................................................... 34|
||3.20|Sub System ................................................................................................... 35|
||3.21|3.21 Line Checker Team ................................................................................ 36|
||3.22|Location Category .......................................................................................... 36|



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **4 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0004-02.png)


||||Page|
|---|---|---|---|
|||**CMC – Construction Method Center**||
||||**4 / 156**|
||3.23|Location .........................................................................................................|36|
||3.24|Pressure Unit .................................................................................................|37|
||3.25|Line Service ...................................................................................................|37|
||3.26|Unit Classification ..........................................................................................|38|
|4.|.<br>|DEFINE ACCESS RIGHTS ................................................................................|39|
|5.|IMPORT SETTINGS ...........................................................................................||39|
||5.1|Weld Thickness/Flange ..................................................................................|40|
||5.2|Import NDE Matrix .........................................................................................|41|
||5.3|Import Project Piping Material List ..................................................................|42|
|6.|SPOOLING ................................................................................................................||45|
||6.1|Spooling .........................................................................................................|45|
||6.2|Ident Code .....................................................................................................|50|
||6.3|Bolting Report ................................................................................................|51|
||6.4|Marian Data ...................................................................................................|51|
||6.5|Browse ...........................................................................................................|54|
|||6.5.1<br>Browse Latest .....................................................................................|55|
|||6.5.2<br>Browse History ...................................................................................|56|
|||6.5.3<br>Manual revision Management .............................................................|57|
|7.|FABRICATION MODULE ..........................................................................................||64|
||SPOOL FABRICATION .............................................................................................||65|
||7.1|Start Fab ........................................................................................................|65|
||7.2|Material Check ...............................................................................................|66|
||7.3|Weld Progress ...............................................................................................|67|
||7.4|Fabricated ......................................................................................................|69|
||7.5|QC Release ...................................................................................................|69|
||7.6|Sent to Paint ..................................................................................................|70|
||7.7|Painted, Final QC and Laydown .....................................................................|71|
|8.|IMPORT PROGRESS MODULE ...............................................................................||71|
||8.1|Import Prefabrication process ........................................................................|72|
||8.2|Import Erection process .................................................................................|74|
||8.3|Import Weld Progress ....................................................................................|74|
||8.4|Import Spool Definition Category ...................................................................|74|
|9.|FABRICATION REPORTS ........................................................................................||75|
|10.|SPOOLTRACKING INTRODUCTION ........................................................................||75|



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **5 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0005-02.png)


|||Page|
|---|---|---|
|||**CMC – Construction Method Center**|
|||**5 / 156**|
||10.1|Overview of Dashboard .................................................................................. 76|
||10.2|Data Analysis ................................................................................................. 77|
||10.3|Barcode Printing ............................................................................................ 80|
||10.4|Mobile Device Management ........................................................................... 81|
||10.5|Offline Synchronization of PDA data .............................................................. 82|
|11.|NDE|MANAGEMENT ................................................................................................ 85|
||11.1|Batch status ................................................................................................... 86|
||11.2|Batch Management ........................................................................................ 87|
||11.3|NDE 100 ........................................................................................................ 92|
||11.4|Issue Examination Process ............................................................................ 93|
||11.5|Examination Progress .................................................................................... 94|
||11.6|Client Examination Progress .......................................................................... 98|
||11.7|Fabrication Dash Board ............................................................................... 100|
|||11.7.1 Filters ............................................................................................... 101|
|||11.7.2 Spool Fabrication Chart : .................................................................. 102|
|||11.7.1 Spool Fabrication Feed Stock Quantities and KPI : .......................... 103|
|||11.7.2 Joint Fabrication Chart : ................................................................... 103|
|||11.7.3 Joint Fabrication Feed Stock Quantities and KPI: ............................. 104|
||11.8|NDE Reports ................................................................................................ 105|
|12.|ERECTION MODULE .............................................................................................. 108||
|ARTICLE I.||DIFFERENT SECTIONS DURING ERECTION PHASE ............................... 109|
||12.1|Spool Erection.............................................................................................. 109|
||12.2|Material Check ............................................................................................. 110|
||12.3|Weld Progress ............................................................................................. 111|
||12.4|To site .......................................................................................................... 113|
||12.5|Erected ........................................................................................................ 114|
||12.6|Welded/Bolted.............................................................................................. 114|
||12.7|Supported .................................................................................................... 114|
||12.8|RFT .............................................................................................................. 114|
||12.9|ERECTION DASH BOARD .......................................................................... 114|
|||12.9.1 Filters ............................................................................................... 116|
|||12.9.2 Spool Erection Chart : ...................................................................... 117|
|||12.9.3 Spool Erection Feed Stock Quantities and KPI ................................. 118|
|||12.9.4 Joint Erection Chart .......................................................................... 119|



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **6 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0006-02.png)


## **CMC – Construction Method Center** 

|||12.9.5 Joint Erection Feed Stock and KPI : ................................................. 120|
|---|---|---|
|13.|ERECTION REPORTS ............................................................................................ 120||
|14.|TESTPACK MANAGEMENT ................................................................................... 122||
|15.|TESTPACK PREPARATION ................................................................................... 123||
||15.1|Testpack builder ........................................................................................... 123|
||15.2|Testpack import ........................................................................................... 125|
|16.|PRESSURE TEST MODULE ................................................................................... 127||
||16.1|Line Check Preperation ................................................................................ 128|
||16.2|Line Check Progress .................................................................................... 129|
||16.3|Item Clearance Preparation ......................................................................... 130|
||16.4|Item Clearance Progress ............................................................................. 131|
||16.5|Blinding Preperation ..................................................................................... 132|
||16.6|Blinding Progress ......................................................................................... 133|
||16.7|Testing and Pre commissioning progress ..................................................... 134|
||16.8|Reinstatement Preperation .......................................................................... 134|
||16.9|Reinstatement Progress ............................................................................... 135|
|17.|TESTPACK HOMEPAGE ........................................................................................ 136||
|18.|TESTPACK EXPLORER ......................................................................................... 137||
||18.1|General - Testpack Level ............................................................................. 138|
||18.2|Release Tracking - Testpack Level .............................................................. 139|
||18.3|Operation Management - Testpack Level ..................................................... 141|
||18.4|Progress Status - Testpack Level................................................................. 141|
||18.5|Spool Status - Isometric Level ...................................................................... 142|
||18.6|Isometric Status - Isometric Level ................................................................ 143|
||18.7|Spool Status – Spool Level .......................................................................... 144|
|19.|FLANGE MANAGEMENT ........................................................................................ 145||
||19.1|Import Bolting Report Data ........................................................................... 145|
||19.2|Flange Manual Revision Management ......................................................... 146|
|||19.2.1 Browse Flange ................................................................................. 148|
|||19.2.2 Flange Joint Progress Template ....................................................... 150|
|||19.2.3 Flange joint progress import method ................................................ 152|
|||19.2.4 Flange joint progress input method ................................................... 153|
|20.|TESTPACK MANGEMENT REPORTS ................................................................... 155||



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0007-01.png)


Page 

## **CMC – Construction Method Center** 

**7 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0007-05.png)


## _Easy Piping Part 1: Set up_ 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0008-01.png)


## **CMC – Construction Method Center** 

Page **8 / 156** 

## **ACCESS TO THE PROJECT SETUP** 

The user can access the setup screen from the home page “Admin Module” of Easy Piping (Below Image) this screen is accessible only for the System admin, Project admin and site admin defined by the project. This screen allows the user to perform various activities like defining a new project, defining the System referential, project referential, define access rights and import settings. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0008-06.png)


The Below Matrix will help the user to know the sequence of operations during setup 

|**PROCESS**|**ACTIVITY NO**|**PROJECT REFERENTIAL ACTIVITIES**|**STEP 1**|**STEP 2**|**PREDECESSOR**|**COMMENTS**|
|---|---|---|---|---|---|---|
|**GENERAL PROJECT DEFINITION**|**Act 3.1**|Sub-contractor list|X||||
|**SPOOLING**|**Act 3.7**|Service class/Material type list|X||||
|**SPOOLING**|**Act 3.8**|Weld Type List|X|||Should define before weldprogress entry|
|**SPOOLING**|**Act 3.9**|NDE Matrix||X|Act 3.7,Act 3.8,Act3. 11||
|**SPOOLING**|**Act 3.10**|Rework Code|X||||
|**SPOOLING**|**Act 3.11**|Thickness|X||||
|**FAB & ERECTION**|**Act 3.12**|Progress Weight Factor|X||||
|**FAB & ERECTION**|**Act 3.3**|Area Classification|X||||
|**FAB & ERECTION**|**Act 3.4**|PDS Area/Sub-contractor list||X|Act 3.1,Act 3.3||
|**FAB & ERECTION**|**Act 3.5**|WPS List|X||||
|**FAB & ERECTION**|**Act 3.6**|WeldersQualification||X|Act 3.1,Act 3.5|Should define before weldprogress entry|
|**FAB & ERECTION**|**Act 3.12**|Project PipingMaterial List|X|||Should define before weldprogress entry|
|**TESTPACK**|**Act 3.13**|Joint CategoryDefinition|X|||Should define before Bolting progress entry|
|**TESTPACK**|**Act 3.14**|Unit of Time Reference|X|||Should define before Bolting progress entry|
|**TESTPACK**|**Act 3.15**|Jointer List|X|||Should define before Bolting progress entry|
|**TESTPACK**|**Act 3.16**|BlindingTeam|X|||Should define beforeTestpackprogress entry|
|**TESTPACK**|**Act 3.17**|FinishingTeam|X|||Should define beforeTestpackprogress entry|
|**TESTPACK**|**Act 3.18**|Reinstatement Team|X|||Should define beforeTestpackprogress entry|
|**TESTPACK**|**Act 3.19**|System|X|||Should define before testpack assignment|
|**TESTPACK**|**Act 3.20**|Sub System||X|Act 3.19||
|**TESTPACK**|**Act 3.21**|Line Checker Team|X|||Should define beforeTestpackprogress entry|
|**TESTPACK**|**Act 3.26**|Pressure Unit|X|||Should define before Testpackpreparation|
|**TESTPACK**|**Act 3.27**|Line Service|X|||Should define before Testpackpreparation|
|**SPOOL TRACKING**|**Act 3.22**|Location Category|X||||
|**SPOOL TRACKING**|**Act 3.23**|Locations||X|Act 3.22||
|**SPOOL TRACKING**|**Act 3.24**|Devices|X||||
|**SPOOL TRACKING**|**Act 3.25**|PDA Users|X||||



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0009-01.png)


Page 

## **CMC – Construction Method Center** 

**9 / 156** 

## **1. PROJECT DEFINITION** 

The project definition module helps the user to setup a new project, define the custom columns and defines the project parameters like project activity no; client and client’s logo, contractor and contractor’s logo, sub-contractor and its logo etc., the user can modify or delete the existing projects 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0009-07.png)


Under this module there are two tabs namely “Add a New project” and “List of Available Projects” which are described here below 

## 1.1 

## **Add New Project** 

The user need to follow the below parameters while creating a new project 

- Activity Code: The alphanumeric string defined for the project Ex: 9833N 

- Project Title:  Project Name Ex: Plateau Maintenance Project 

- Owner: The name of the client company 

- Contractor: The name of the contractor company 

- Owner Logo (System will accept only the following file types ".bmp" ".jpg"  and size should be less than 200 KB) 

- Contractor Logo (System will accept only the following file types ".bmp" ".jpg"  and size should be less than 200 KB) 

- Maximum Transit Time (default value 1) this value is used in the ‘Spool Tracking’ module to calculate the no. of days a spool has been in transit from a location. The last tracking date of a spool will be compared with the current date, and if the difference exceeds the ‘Maximum Transit Time’, the spool will be listed in the ‘Transit out’ section. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**10 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0010-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0010-07.png)


- On clicking the icon , the user will see a grid with 4 tabs: 

   - Spool Prefabrication 

   - Spool Erection 

   - Spool Weld Progress 

   - PDS Area Subcontractor 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0010-13.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0011-01.png)


Page 

## **CMC – Construction Method Center** 

**11 / 156** 

Prefabrication, Erection and Weld tabs show the default columns that are available to the user to enter the progress information in the ‘Progress’ module. 

In the Prefabrication tab, the following columns are the default columns that will appear under Spool Fabrication: 

- Start Fab 

- Fabrication 

- QC Release 

The following columns are the default columns that will appear under Painting: 

- Sent to Paint 

- Painted 

- Final QC 

- Laydown 

**Prefabrication & Erection : U** ser can add up to 3 custom columns to the ‘Prefabrication’ and ‘Erection’ tabs. The user has to specify whether the newly added column should appear under ‘Painting or ‘Fabrication’ by checking or clearing the ‘Painting’ checkbox. 

All columns under this tab are used to record progress in the respective modules and therefore they are expected to be ‘date’ values. These columns can be positioned in any order by clicking on the ‘up’ and ‘down’ arrows. These custom columns will appear in the Progress module in the order defined. 

The custom columns added by the user can be edited and deleted at any time, even if the project has some values in front of these columns, in such case these values will be lost. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0011-18.png)


**the PDS Area/ Subcontractor:** The user can add 3 custom columns to the PDS Area/ Subcontractor tab. The Use of this option is  to define custom attributes at PDS Area level. The Columns which are defined in the following screen 

These custom columns will appear in the Project referential of PDS Area/ Subcontractor . It will allows the user to link the information to the subcontractor by design area.(Refer to Para 3.4) 

They will also appear as filters in “Summary report”, “Weekly fabrication” and “Progress Report-Fabrication “reports. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0012-01.png)


Page 

## **CMC – Construction Method Center** 

**12 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0012-05.png)


**Spool Category Definition:** Spool Category Definition options allows user to  define custom attributes to all spools. In this Option user can define 3 custom attributes at Spool Area level. The Columns which are defined in the following screen 

There defined attributes can be updated against each spool through import module.(Refer to Para 3.4) 

They will also appear as filters in “Fabrication”, “Weekly fabrication” , “Erection” and “Weekly Erection Reports”. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0012-09.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**13 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0013-02.png)


Page 

## **CMC – Construction Method Center** 

## 1.2 **List of available projects** 

The tab allows the user to view project’s information and edit some of the associated data. The following parameters can be modified when modifying a project in SYSTEM: 

- Activity Code 

- Project Title 

- Owner 

- Contractor 

- Owner Logo 

- Contractor Logo 

- Maximum Transit Time 

The custom columns can be added at a later stage as well. These custom columns can also be deleted at any stage in the project. However, all the data belonging to these columns will also be deleted. 

The System Administrator can delete a project. However, he must be logged into another project to delete a particular project. All project specific information like project referential, isometrics, spools, joints, batches, progress information, and examination information will be deleted. 

The user can choose the icons ( ) & ( ) to delete and edit the details respectively. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0013-17.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **14 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0014-02.png)


## **CMC – Construction Method Center** 

## **2. SYSTEM REFERENTIAL** 

The System referential module will allows the System admin to define all the lists that the application might refer to through the course of the application, irrespective of the project selected. These lists include the following: 

- Material Type List 

- Film Quantity per Diameter 

- UT Calculation 

- Torquing Requirement 

The above referential is common to all projects. 

Once these lists are defined, they will appear as a dropdown list whenever needed in the various screens of the application so that the user can select values out of these lists. The objective of this approach is to maintain the consistency of data entry across the application, which will result in better and accurate reports. Moreover, it will ease up the data entry process. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0014-13.png)


## 2.1 **Material Type** 

In the below picture all the lists are shown as explained earlier, as the screen shows the first sub tab material list. This screen will allow the user to define all the different types of materials. The user needs to define the Code and Description both the fields are mandatory. Once it is defined, the user is not allowed to delete the material type if it is assigned for any service class but can be modified at any time. The same will display in all kind of reports 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**15 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0015-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0015-07.png)


## 2.2 **Film Quantity per Diameter** 

The screen displays to the user the film quantities based on pipe diameter and thickness. This number will be displayed to the user in the relevant Progress screen. This screen is static and user will not be allowed to edit or delete any information. However the user can edit the total number of films in the RT progress screen. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0015-10.png)


## 2.3 **UT Calculation** 

The screen displays to the user the values of referential “Coefficient Diameter” and “Coefficient Rating”. This screen is also static and user cannot edit or modify at any time. The values are based on Technip standards. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0016-01.png)


Page 

## **CMC – Construction Method Center** 

**16 / 156** 

These values are used for UT calculations based on the diameters and it will export the values in the “Flange joint progress”. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0016-06.png)


## 2.4 **Torquing requirement** 

The user can view the methods of bolting. This screen is a static screen, the torqueing methods are defined in this referential none of the values can be edit or modify. 

- Manual 

- Torquing 

- Tensioning 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0016-12.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**17 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0017-02.png)


Page 

## **CMC – Construction Method Center** 

## **3. PROJECT REFERENTIAL** 

The project referential module will be used to define all the lists that the application might refer to through the course of the application. These lists include the following: 

- Sub-contractor list 

- Progress Weight Factor 

- Area Classification 

- PDS Area/Sub-contractor list 

- WPS List 

- Welders Qualification 

- Service class/Material type list 

- Weld Type List 

- NDE Matrix 

- Rework Code 

- Thickness 

- Project Piping Material List 

- Joint Category Definition 

- Unit of Time Reference 

- Jointer List 

- Blinding Team 

- Finishing Team 

- Reinstatement Team 

- System 

- Sub System 

- Line Checker Team 

- Location Category 

- Locations 

- Devices 

- PDA Users 

- Pressure Unit 

- Line Service 

Once the above lists are defined, they will appear as a dropdown list whenever needed in the various screens of the application so that the user can select values out of these lists. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0018-03.png)


Page 

## **CMC – Construction Method Center** 

**18 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0018-07.png)


## 3.1 **Subcontractor List** 

The user can define all the subcontractors specified by the project, the user need to define the following details 

- Subcontractor Code 

- Subcontractor Description 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

Once it is defined, the System will not allow the user to delete if the subcontractor is already assigned to any PDS Area. However the user can edit or modify the code and description at any time 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**19 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0019-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0019-05.png)


## 3.2 **Progress Weight Factor** 

The user need to define the progress weight factors, these weight factors are used to calculate the completion of the following activities. 

- Spool Prefabrication 

- Spool Painting 

- Spool Erection 

Each activity in each phase will have its own progress factor; the total of progress factors for all the activities should be one hundred. In the reports module, the progress will be reported either by phase (prefabrication, painting, erection), or as an overall progress. The weight values can be modified at any time, but if modified, it will have a direct impact on the weight calculation of the generated reports. It should be noted that there will be discrepancies between reports before modifying the weight and after modifying the weight. 

After every change please press ( ) to update the details. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**20 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0020-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0020-07.png)


## 3.3 **Area Classification** 

This screen helps the user to define the Area classification of the project, the user need to define the following details 

- Area Classification code 

- Area Classification description 

The same details will be used while linking certain PDS areas in another referential (Refer to Para 3.4) this codes are used to generate reports by different area classification. The user can see all the areas in the dropdown while generating various reports. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**21 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0021-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0021-07.png)


## 3.4 **PDS Area/Subcontractor** 

This screen is used to define the referential based on the PDS (Design area) and assign to the following details 

- Shop Sub-contractor 

- Field Sub-contractor 

- Area Classification 

- AG/UG 

In addition of above, the user can specifies the area is unit or rack and any custom column if any, which are predefined while defining project (Refer to Para 1.2) 

Note: The subcontractor can be assigned only by Design area, if the user wants to change the subcontractor of a particular Isometric, It can be done manually in the browse latest module. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0022-03.png)


Page 

## **CMC – Construction Method Center** 

**22 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0022-07.png)


## 3.5 **WPS List** 

This screen is used to define the WPS approved by the Quality team. The WPS defined in this screen is used in the Welder Qualification module in order to define the WPS for a particular qualified welder. The user defines each WPS with material type, Dia, thickness and link to a subcontractor. _Validations_ 

- All fields are mandatory. 

- Diameter and Thickness allow only numeric values. 

- To Dia should be greater than or equal to From Dia. 

- To Thickness should be greater than or equal to From Thickness. 

During data import from spooling, Easy Piping will automatically check that a WPS exists in the WPS list to cover new joints. If WPS (based on joint dia, thickness and material type) does not exist, SYSTEM will alert the user but import can proceed. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**23 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0023-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0023-07.png)


## 3.6 **Welder Qualification** 

This screen is used to define the welder code and name of welders qualified for the project. The user needs to link the welder to a subcontractor and WPS. This screen allows the user to add, delete and edit the welder code until and unless there is no records for the related welder. The same welders will be seen in a dropdown list in the relevant progress module. In order to qualify the welders, the user needs to create the WPS List. (Refer above Para 3.5) 

All the fields are mandatory 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**24 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0024-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0024-07.png)


## 3.7 **Service class/Material type** 

This screen allows the user to define all the service class available for the project and link to the material type. In order to link, the user have to define the material type (Refer to the Para 2.1) All the service classes are corresponding codes uploaded from the spooling data. The service class cannot be deleted but it can be edit or modify at any time. 

The Material type is used while defining the WPS (Refer to Para 3.5) and for generation of the reports as well. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0024-11.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**25 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0025-02.png)


Page 

## **CMC – Construction Method Center** 

## 3.8 **Weld type List** 

This screen contains references of all the different types of welds that will be uploaded automatically from the spooling data. In this screen the user can only add new weld types. The list contains the following 

- Weld type code (This type code is from spoolgen data) 

- Weld type description 

- Dia inch factor – User to define Yes or No 

Note: If the user defines “Yes” in Dia-inch Factor for a weld type code, the joint will be       counted in the Dia inch calculation in the reports. 

If the user defines “No” In Dia-Inch factor for a weld type code, the joint will not be counted in the Dia inch calculations in the reports 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0025-12.png)


## 3.9 **NDE Matrix** 

This screen helps the user to define the NDE (Non Destructive Examination) % required for the different types of weld categories. 

- User needs to define the various types of testing parameters like RT, MT, PT and UT etc. based on the piping class, weld type and weld location. 

- All the fields in this screen will be available as a dropdown list where the user can select the required information. 

- The columns RT, UT, MT, PT, PMI, and HT are dropdown lists having the values for different percentages ranging from 0 to 100. 

- The columns PWHT, Material Traceability is a dropdown list that will allow “Y” or “N” and the user can also define the thickness which required PWHT. 

- The matrix can be filled in an excel format and upload in the System through the import module. 

- During import of spools, the System will validate whether the imported welds have the combination of piping class, location and weld type is already defined in the NDE matrix. If not, the System will alert the user and import is not allowed. 

- During a weld Progress entry, the System will automatically check the NDE % defined in the NDE matrix and allocate a batch based on the examination category to the joint. This case is particularly for 5% or 10% categories. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0026-01.png)


Page 

## **CMC – Construction Method Center** 

**26 / 156** 

- In the case of NDE 100 %, the system will automatically allocate the joints to the relevant NDE category during the spooling data import. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0026-07.png)


## 3.10 **Rework Code** 

This screen helps the user to define the different rework codes and their description. 

- Rework Code and Description are textboxes 

- Both fields are mandatory. 

- The user can Add, Edit, Delete at any time during the project phase. 

- This code will be displayed to the user in a dropdown list in the weld progress screen. 

- There is no limit in number of codes. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**27 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0027-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0027-05.png)


## 3.11 **Thickness** 

The screen helps the user to define criteria to automatically allocate the Thickness for the welds. The criteria are based on Piping class and Diameter of the joint. The thickness information will not be reflected in Isometric. All the fields are mandatory 

User has to enter values for the following columns: 

- Service Class 

- Dia Inch 

- Thickness 

- Flange Rating 

During Spooling import, System will automatically check that a weld has a corresponding thickness defined in the System by checking its piping class and dia-inch. If it does not exist, System will alert the user and import will be stopped. The same service class and diameter should not have two different thicknesses. It should be always unique. 

This screen also helps the user to define flange ratings. During bolting import, System will automatically check that a joint has a corresponding flange rating defined in the System by checking diameter. If it does not exist, System will alert the user and import will be stopped. 

- Duplicate values for thickness for same piping class and dia-inch are not allowed. Validation will occur 

- There should be only 1 Flange Rating entry for a particular combination of piping class, dia inch and thickness. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**28 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0028-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0028-07.png)


## 3.12 **Project Piping Material Class** 

The user need to define the define the following details 

- MRR No(Material reception request) 

- Ident code 

- Trace number (Heat number or File No) 

This referential is used in the material traceability screen in progress module. The above details can be imported by using Excel format in the import settings module. It allows the system to validate the codes of trace number vs. Ident code. 

Note: The file can be exported from SP Mat 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**29 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0029-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0029-07.png)


## 3.13 **Joint Category Definition** 

This referential is used for Flange management and Test pack management. The flange joints will be assigned for the below mentioned parameters to manage the Bolt torquing activities. User cannot delete once it is defined for any flange joint. 

Each flange joint is associated to a category corresponding to the timing of the joint execution. These categories are directly linked to the test-pack limits and the precomissionning activities. 

User has to define the details for the following columns: 

- Joint Definition 

- Timing 

- Category 

- Reason 

- Coefficient category 

Joint definition is the subject to define for a particular joint when it has to be performed. Below are the following example cases 

- Joint to be done before Pressure Test 

- Joint to be done after Pressure test but before Precomm 

- Joint to be done after precomm 

Timing is the subject to define the period (Before Pressure test, before Precomm, After Precomm 

Category is the subject to categorize the activities by defining with codes like (X, Y, Z) or (A, B, C) and it varies from project. 

Reason is the subject to define the bolting point like vent point, Test blind point, drain point, blowing point etc. The coefficient category is the value which is defined based on the punch category and reason. There are some standard coefficient values based on above criteria 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0030-01.png)


Page 

## **CMC – Construction Method Center** 

**30 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0030-05.png)


After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0030-07.png)


## 3.14 **Unit of time reference** 

This reference is used to calculate the work volume (Unit of time required to execute the jointing). This referential is used in ‘Generate Flange Joint Progress’ template. The ‘UT Calculation’ column is calculated based on the ‘Project UT’ values. 

The user have to define the following details 

- Activity 

- Project UT (Unit of Time) 

- Standard Reference 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0031-01.png)


Page 

## **CMC – Construction Method Center** 

**31 / 156** 

The equivalent quantities are calculated from the quantity of each bolting operation by using the adequate multiplier factors for Piping Size, Flange Rating and punch category 

UT = Reference point quantity x coef Diam x Coef Rating x Coef category 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0031-07.png)


## 3.15 **Jointer List** 

User has to define the following columns: 

- Jointer Code 

- Jointer Description 

This referential will be used in the flange management. If the user tries to delete a Jointer which is already assigned to a Flange Joint, the System won’t allow the deletion. However, the System will allow modifying the Jointer code and description even if it is assigned to a Flange joint. Duplicate values are not allowed to be entered in Jointer code. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**32 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0032-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0032-07.png)


## 3.16 **Blinding Team** 

This screen allows the user to define the following details 

- Code (Blinding team) 

- Description 

This referential is used in the pressure test module. If the user tries to delete a Blinding Team which is already used in blinding module, the System won’t allow the deletion. However, the System will allow modifying the code and description even if it is assigned to blinding module. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0033-03.png)


Page 

## **CMC – Construction Method Center** 

**33 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0033-07.png)


## 3.17 **Finishing Team** 

This screen allows the user has to define the following columns: 

- Code 

- Description 

This referential is used for Pressure Test (Item Clearance Module). If the user tries to delete a Finishing Team which is already used in Item clearance module, the System won’t allow the deletion. However, the System will allow modifying the code and description even if it is assigned to Item clearance module. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0033-13.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**34 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0034-02.png)


Page 

## **CMC – Construction Method Center** 

## 3.18 **Reinstatement Team** 

User needs to enter values for the following columns: 

- Code 

- Description 

This referential is used for Pressure Test (Reinstatement Module). 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0034-10.png)


## 3.19 **System** 

User needs to define the following columns: 

- Code 

- Description 

This referential is used for Test Pack module. The test packs will be assigned to the System which is defined by the project. Both fields are mandatory. 

Note: This referential will be integrated with easy plant. 

After every change press ( ) to update the details and user can use the icons ( ) & ( ) to delete and edit the details respectively. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0035-03.png)


Page 

## **CMC – Construction Method Center** 

**35 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0035-07.png)


## 3.20 **Sub System** 

This screen allows the user to define the sub System which is linked to the System. This referential is used in the test pack module. The user needs to define the following details 

- Code 

- Description 

- System 

The column System will be auto drop down. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0035-14.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**36 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0036-02.png)


Page 

## **CMC – Construction Method Center** 

## 3.21 **3.21 Line Checker Team** 

This screen helps the user to define the line checking teams for a specific project. The test packs or Isometrics will be assigned for the line checker team. This referential is used in the test pack module. The user needs to enter the code and description. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0036-07.png)


## 3.22 **Location Category** 

This referential is used in the spool tracking module. This screen helps the user to define the code and descriptions for the different areas of a project. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0036-10.png)


## 3.23 **Location** 

This referential is used in the spool tracking module. This screen helps the user to define the Code, Description, Category, Mapped progress columns. It establishes a relation between spool location and spool status where system will provide an analysis of consistencies. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**37 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0037-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0037-07.png)


## 3.24 **Pressure Unit** 

This is a referential for the assigned Pressure unit of the Project. Only one Pressure unit will be assigned to a project and this will be used to in Test Pack Builder Module when adding new Test Packs. Normally the following will be used on any project 

- Bar 

- Psi 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0037-12.png)


## 3.25 **Line Service** 

This screen helps the user to define the line service code and description. This is used in the testpack builder module to define the line service of the specific testpack.These codes will be the auto dropdown while creating a test pack. 

Note: The Codes must be related to the line service code included in the spooled Iso’s data 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0038-03.png)


Page 

## **CMC – Construction Method Center** 

**38 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0038-07.png)


## 3.26 **Unit Classification** 

Unit Classification is another level of Hierarchy which stays above Area Classification. This screen helps user to define Units of the project. These Units are shall appear in “Area Classification” definition as drop down while defining Areas. 

This Units shall appear in Report Filters as selection criteria while generating reports. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0038-11.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**39 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0039-03.png)


## **CMC – Construction Method Center** 

## **4. . DEFINE ACCESS RIGHTS** 

This module allows the administrator to create a new user and assign a role as per the project specific. The roles can be edit and deleted at any time. The role is based on project based, user can access to several projects with different rights. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0039-07.png)


- When assigning a new user a “subcontractor” role, the System will display the list of subcontractors available for this project (from the “subcontractors” referential) 

- Subcontractor can view only data related to his PDS area. This is maintained by forcing all the ‘’Subcontractor’ dropdown lists in all the screens to be disabled and set the selected value as logged-in subcontractor. 

## **5. IMPORT SETTINGS** 

This module helps the user to generate an empty excel template in which the user can enter the relevant information and import into the System. There are several sub modules where the user can perform the imports for different kind of information which will be used throughout the process. These are the following sub modules available in this module. 

- Weld thickness/Flange 

- NDE Matrix 

- Project Piping Material List 

- Spooling Images 

- Spooling Material 

- Spooling Class Material 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0040-03.png)


Page 

## **CMC – Construction Method Center** 

**40 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0040-07.png)


## 5.1 **Weld Thickness/Flange** 

This module helps the user to generate an empty excel template in which the user can enter the weld thickness details and import to the System. The user needs to define the following details in the template 

- Piping Class 

- Dia Inch 

- Thickness 

- Flange Rating 

The user should choose the option 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0040-15.png)


to generate the empty template. 

During the import procedure the System will validate the information provided by the user. In this case the user needs to follow certain rules 

- Piping class, Dia-inch, Thickness and Flange Rating are mandatory fields. 

- There should be no duplicate entries, i.e., there should be only 1 thickness entry for a particular combination of piping class, dia inch and Flange Rating. 

- Piping class entered in the excel file should exist in the project referential. 

- Numeric values are only allowed for Dia-inch, Thickness and Flange Rating. 

The user needs to click the option to select the file to import. After this action the user has to 

click on the option to import the file. By choosing the option the data will be saved successfully in the database. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0041-03.png)


Page 

## **CMC – Construction Method Center** 

**41 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0041-07.png)


## 5.2 **Import NDE Matrix** 

This module helps the user to generate an empty excel template in which the user can enter the NDE Matrix details and import to the System. The user needs to define the following details in the template 

- Location 

- Piping class 

- Weld Type 

- RT% 

- UT% 

- MT% 

- PT% 

- PMI% 

- PWHT 

- HT% 

- Material Traceability 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0041-21.png)


## The user should choose the option 

## to generate the empty template. 

During the import procedure the System will validate the information provided by the user. In this case the user needs to follow certain rules 

- Piping class entered in the excel file should exist in the project referential. 

- Weld type entered in the excel file should exist in the project referential. 

- ‘Location’ column should only have the values ‘Shop’ or ‘Field’. 

- RT, UT, MT, PT, PMI, HT should have values 0, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100. 

- PWHT and ‘Material Traceability should only have values ‘Y’ or ‘N’. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0041-30.png)


option to select the file to import. After this action 

The user needs to click the 

the user has to click on the option to import the file. By choosing the option 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0042-01.png)


Page 

## **CMC – Construction Method Center** 

**42 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0042-05.png)


the data will be saved successfully in the database. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0042-07.png)


## 5.3 **Import Project Piping Material List** 

This module helps the user to generate an empty excel template in which the user can enter the Project material details and import to the System. The user needs to define the following details in the template 

- MRR No 

- Ident Code 

- Heat No. 

The user should choose the option to generate the empty template. The user needs to click the option to select the file to import. After this action the user has to click on the option to import the file. By choosing the option 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0042-14.png)


the data will be saved successfully in the database. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**43 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0043-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0043-05.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0044-01.png)


Page 

**CMC – Construction Method Center 44 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0044-04.png)


## _Easy Piping Part 2: Preparation_ 

## **PREPARATION MODULE** 

The Preparation module is organized in 4 different sections. This module allows the user to import all the information’s like spooling data, material status data which will be used during the operation phase. This module also helps navigate the status of latest and history of each isometrics. The details of each section are explained below in detail. 

- Spooling 

- Marian Data 

- Browse 

- Test pack Builder 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**45 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0045-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0045-05.png)


## **6. SPOOLING** 

This module is interrelated with the spooling outputs. This module helps the user to import the spooling information (Iso NO, Spool NO, Weld No, Size Etc.)Into Easy Piping. Both the New spooled Isometrics and revised spooled Isometrics are able to import in this screen. This information’s are exported from the spooling in a predefined .txt or .csv format. This module is having 3 tabs which are namely “Spooling”,”Ident Code”, “Bolting report” and works with the similar function. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0045-08.png)


## 6.1 **Spooling** 

In the spooling section. The user can use the Icon and select the file and use the icon to import all the weld data into Easy Piping. This information will be shown in the browse screens, fabrication and erection modules also. 

Note: The file size should not exceed 4MB 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0046-01.png)


Page 

## **CMC – Construction Method Center** 

**46 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0046-05.png)


## **Importing Data** 

Once the user imports the “weldsumm data” into Easy piping. The system will validate the information. If the file consist any errors the system will display an error message and user can able to export the error file. The user can choose the option to export the file. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0046-08.png)


## Note: 

• PSMS will validate whether PDS Area, Service class and Weld Type data that is being imported exists in the corresponding referential. If not, the import process will stop and the user will be notified. 

• PSMS will validate whether the ‘thickness’ for the imported welds exist in the ‘Thickness’ referential by checking the weld’s Piping class and dia-inch. If it exists, PSMS will assign the corresponding thickness to the weld, otherwise an error message will appear. 

• PSMS will validate whether each imported weld has a corresponding NDE in the NDE matrix referential by checking the weld’s location, piping class and weld type. If it does not exist, an error message will appear against the particular weld. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0047-01.png)


Page 

## **CMC – Construction Method Center** 

**47 / 156** 

- PSMS will check that a WPS exists in the WPS list to cover new joints. If WPS (based on joint dia, thickness and material type) does not exist, PSMS will alert the user with a warning message but import can proceed. 

- PSMS will check whether there are different entries for pipeline no. for a particular ISO. If so, the user will be alerted. An ISO should have the same pipeline no. for all spools and welds. 

- PSMS will check whether there are different entries for service class for a particular ISO. If so, the user will be alerted. An ISO should have the same service class for all spools and welds. 

- As long as the imported file is not validated by PSMS (contains errors), the import process will not be completed. 

Once all the errors are rectified by the user the system will display the results. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0047-10.png)


## **Revision Management** 

If the imported data have no previous revisions (For ex: Importing ISO R0 for the first time) associated to it in the database, then Easy Piping will simply import the data to the database. 

In case the imported data is having a previous revision (For ex: Importing ISO R1 or R2 or R3, etc. when R0 already exists in the system) stored in Easy Piping, then the revisions management process will be triggered. The revisions management process will alert the user informing him that a previous revision of the imported data was found, the user can select to proceed to resolve the conflict and take action, or he can choose to cancel the entire import process. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0047-14.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **48 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0048-02.png)


## **CMC – Construction Method Center** 

If the user chooses to proceed, Easy Piping will display a list of all the ISOs which are found to have a previous revision in the database, next to each ISO, there will be a “status” column to indicate whether the conflict of each ISO has been resolved or not. The user can click on each of the ISO’s one by one to resolve the conflict. 

Each time the user selects an ISO to resolve the conflict, a wizard will be launched to allow the user to visually compare the definition and progress information related to the new version versus the previous version of each spool. The wizard starts by comparing the prefabrication and erection in the same screen, and if necessary the welds related to each ISO. In each step, the system will show the original progress data on the top, versus the new data in the bottom. 

When comparing between a spool of an older revision and a spool of a newer revision, the older ones will appear on top with all progress information related to “Prefabrication” and “Erection” on the same grid, while in the bottom the revised spool will appear with blank progress information. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0048-07.png)


the progress information will either be copied to the newer revision of the spool or not, as explained in the table below: 

||**Status**|**Action **|**Check Weld? **|
|---|---|---|---|
||Not Done|The user will select this value if there is<br>no progress information. No action to be<br>taken in this case, the newer version of<br>the spool will remain empty, same<br>applies to theweld|No|
||Cancelled|The user will select this value if the spool<br>has been cancelled. No action to be<br>taken in this case, the spool will not<br>appear inthenewer revision.|No|



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**49 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0049-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0049-05.png)


||Done, but<br>revised w/o<br>modification|This value refers to Spools which are<br>fabricated in the older revision, but the<br>newer version of the spool hasn’t<br>changed, so the progress information of<br>the older revision will be copied to the<br>newer revision. Weld progress<br>information of the older revision will also<br>be copied to welds in the newer revision.<br>The ‘Spool Revision No.’ will remain the<br>same.|No.|
|---|---|---|---|
||Rework|If the user selects this value, it means<br>that the spool in the older revision has<br>been fabricated (or fabrication has<br>started) but it has changed in the newer<br>revision, which will result in rework. In<br>this case, the system will copy the<br>“Fabrication Start Date”, “Sent to Paint”<br>and “Paint” from the older revision to the<br>new revision. The system will force the<br>user to go to the level of the weld, and<br>validate welds one by one. The ‘Spool<br>Revision No.’ will also be changed to the<br>new ISOrev no.|Yes|




![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0049-07.png)


Concerning the weld progress, the “status” column will also apply based on the following values (this is only considered if the spool is “Rework”): **Status Action** 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**50 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0050-02.png)


Page 

## **CMC – Construction Method Center** 

||Not Done|The user will select this value if there is no progress information. No<br>action to be taken in this case, the newer version of the weld will remain<br>empty.|
|---|---|---|
||Cancelled|The user will select this value if the weld has been cancelled. No action<br>to be taken inthis case, theweldwilldisappear inthenewer revision.|
||Done, but<br>revised w/o<br>modification|This value refers to welds which are fabricated in the older revision, but<br>the newer version of the weld hasn’t changed, so the progress<br>informationofthe older revision willbe copied to thenewer revision.|



When the user has finished resolving the conflict of a specific ISO, Easy Piping will redirect the user back again into the first screen which displays the list of ISO’s to be resolved , the status of the resolved ISO’s will be updated to indicate that the conflict was resolved. This process will keep going until the user has finished resolving the conflict for all the ISO’s. The user can then finish the process and complete the import. Once the import process is successfully finishes, the system will assign automatically all the new revision numbers to the spools impacted. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0050-07.png)


This revision management can be done manually without .txt file. The user can edit the Isometrics by using “Manual revision management” which is generally used by site spooling team. The detailed process is explained in the Para 6.5.3 

## 6.2 **Ident Code** 

In the Ident code section, the user can use the Icon and select the file and use the Icon to import all the trace files from spooling output .txt files into Easy Piping. This Information will be shown in the material traceability screen. (Refer to Para 7.2) 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0051-03.png)


Page 

## **CMC – Construction Method Center** 

**51 / 156** 

Note: The file size should not exceed 4MB 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0051-08.png)


## 6.3 **Bolting Report** 

In the bolting report section, the user can use the Icon and select the file and use the Icon to import all the Bolting records from spooling outputs .txt files into Easy Piping. This information will be shown in the Erection progress screen. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0051-11.png)


## 6.4 **Marian Data** 

This module helps the user to import the material status “Marian Data” and this file is generated from SP-MAT (Marian). SP-MAT forecast runs and reservation runs are executed by spools. The export file from Marian will have the information of material status and weight of each spool. This should be an excel format with specified columns which is designed for Easy Piping Import. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0052-01.png)


Page 

## **CMC – Construction Method Center** 

**52 / 156** 

The user can use the Icon and select the file and use the Icon to import the Marian data into Easy Piping. This information will be seen in the browse screens, where the weight of each spool, forecast dates of material arrival and status of the spools are shown as 

- ALREADY COMPLETED: This status states that all the materials required for a particular spool have been already issued or reserved before the forecast run. SP-MAT will consider that materials are reserved until they are on a MIR and the MIR is posted. Some of the reserved materials might therefore have been already given to contractor (MIR not yet posted) whereas some have not yet been given to contractor (not yet on a MIR). The date of availability for such spools will be determined based on the latest availability of its items: items already on MIR will be considered available at the issue date attached to the MIR whereas materials not yet on MIR will be considered available at the date of the Forecast run. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0052-07.png)


- NOW COMPLETE: This status states that all the materials of a required spool are available at the date of forecast run. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0052-09.png)


- TO COMPLETE: This status states that the forecast run has identified all the materials but some materials are not available in the ware house and the forecast run has found all the materials in the Purchase Order(PO) with the last material date available. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0053-01.png)


Page 

## **CMC – Construction Method Center** 

**53 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0053-05.png)


- INCOMPLETE: This status states that all the materials of a particular spool are not available and there is no date for full availability of material of that spool. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0053-07.png)


The Import file should not contain any inappropriate data. If the file is having any errors, the system will alert the user with the appropriate error message and by highlighting the error in red color. If any of the imported data will overwrite the data in the database, it will be highlighted in yellow to alert the user. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**54 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0054-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0054-07.png)


## 6.5 **Browse** 

This module helps the user to navigate in a hierarchical manner between the Isometrics, Spools and welds. It will allow the user to view all the information related to each category (Iso, Spool and weld). The user with proper rights like system admin or project admin can also edit some information in this screen. This module is organized in the following tabs as below mentioned. 

- Latest 

- History 

- Manual Revision Management 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0054-13.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0055-01.png)


Page 

## **CMC – Construction Method Center** 

**55 / 156** 

## **6.5.1 Browse Latest** 

This module helps the user to search different parameters from the filters like PDS area, Line No, Isometric No, Service class, Subcontractor, Area Classification etc. 

In this menu, the search results will display the latest information in a hierarchical format starting from the ISO, the user can select to expand and explore a specific Iso and related spools also will appear, the user can roll down to the level of the weld to explore the welds belonging to a specific Spool. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0055-08.png)


This module helps the user also to edit some information like 

- -Type 

- -Shop subcontractor 

- -Field subcontractor 

- -Material type 

The above fields can edited at any time during the project phase, The shop and Field subcontractor can edited on Iso level as mentioned in the (Refer to Para 3.4) Note: 

- All the welds in a given spool cannot be deleted. A spool should have at least 1 weld. 

- When a weld is progressed, the user cannot delete the particular weld, spool or ISO, i.e., if an ISO or spool has even 1 weld that is progressed, then it cannot be deleted. Only welds that are not progressed can be deleted. 

- When a weld is progressed, then that particular weld cannot be edited. 

- When an ISO is deleted, PSMS asks the user whether it is a Soft Delete or Hard Delete. 

Soft delete means that the deleted ISO will go to “Browse History” with a status=”soft deleted” and comments= date/by (whom deleted). 

Hard delete means that the record (ISO, Spool, and Weld) will be deleted permanently from the database. 

The user can use this ( ) Icon to edit the information and ( ) to save the information. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**56 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0056-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0056-05.png)


## **6.5.2 Browse History** 

This module helps the user to view the history of an Isometric with his various revisions. In this module the user cannot edit any information. The ISO’s that have been soft deleted from the “Browse Latest” will appear in the “Browse History”. the search results will display all the information in a hierarchical format starting from the ISO, the user can select to expand and explore a specific Iso and related spools also will appear, the user can roll down to the level of the weld to explore the welds belonging to a specific Spool. 

In terms of the information displayed in the screen, the same columns of “Browse Latest Revision” will appear in “Browse History”, in addition to that, an extra field “Comments” will appear in the level of the spool and weld. The comments column can have different information depending on the following: 

- In a revised ISO/Spool/Weld, the “comments” column will display information on the status of each spool and weld when revised (not done, done without modifications, rework, cancelled). 

- In a soft-deleted ISO, the “comments” column will display information related to who/when the ISO was soft-deleted. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**57 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0057-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0057-07.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0057-08.png)


## **6.5.3 Manual revision Management** 

This module helps the user to do revision management manually. In this module the user can revise the isometric without the use of spooling .txt file. This module will be mostly used by the site spooling team to revise the field revision Isometrics. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0058-03.png)


Page 

## **CMC – Construction Method Center** 

**58 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0058-07.png)


The user can search the isometrics from the fields as shown above, upon searching the isometrics the system will display the list of isometrics as a dropdown and the user can select the required isometric. After selection of Isometric, the system will take to the revision management screen where the user can revise the isometric as required. The system will show in a hierarchical manner with a default spool status “Done without Modification” 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**59 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0059-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0059-07.png)


In this screen, the user needs to put the revision number manually and add the comments wherever required during the revision process. All the previous revisions will go the browse history where user can view the changes made in that particular revision. 

The progress information will either be copied to the newer revision of the spool or not, as explained in the table below: 

||**Status**|**Action **|**Check Weld? **|
|---|---|---|---|
||Not Done|The user will select this value if there is no<br>progress information. No action to be taken in<br>this case, the newer version of the spool will<br>remainempty, same applies to theweld|No|
||Cancelled|The user will select this value if the spool has<br>been cancelled. No action to be taken in this<br>case, the spool will not appear in the newer<br>revision.|No|
||Done, but<br>revised w/o<br>modification|This value refers to Spools which are fabricated<br>in the older revision, but the newer version of<br>the spool hasn’t changed, so the progress<br>information of the older revision will be copied<br>to the newer revision. Weld progress<br>informationofthe older revision willalso be|No.|



O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0060-01.png)


Page 

## **CMC – Construction Method Center** 

**60 / 156** 

|||copied to welds in the newer revision. The<br>‘Spool Revision No.’ will remainthe same.||
|---|---|---|---|
||Rework|If the user selects this value, it means that the<br>spool in the older revision has been fabricated<br>(or fabrication has started) but it has changed in<br>the newer revision, which will result in rework.<br>In this case, the system will copy the<br>“Fabrication Start Date”, “Sent to Paint” and<br>“Paint” from the older revision to the new<br>revision. The system will force the user to go to<br>the level of the weld, and validate welds one by<br>one. The ‘Spool Revision No.’ will also be<br>changed to thenew ISOrev no.|Yes|



The user can click on the Icon to “expand” to view on weld level. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0060-07.png)


If the user goes to the weld level and did any actions then spool will consider as ‘Rework’. For example, If user add new joint or made any modification to the existing joint then the spool status will changed to ‘Rework; automatically. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**61 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0061-02.png)


Page 

## **CMC – Construction Method Center** 

Concerning the weld progress, the “status” column will also apply based on the following values (this is only considered if the spool is “Rework”): 

||**Status**|**Action**|
|---|---|---|
||||
||Not Done|The user will select this value if there is no progress information. No<br>action to be taken in this case, the newer version of the weld will remain<br>empty.|
||Cancelled|The user will select this value if the weld has been cancelled. No action<br>to be taken in this case, the weld will disappear in the newer revision.|
||Done, but<br>revised w/o<br>modification|This value refers to welds which are fabricated in the older revision, but<br>the newer version of the weld hasn’t changed, so the progress<br>information of the older revision will be copied to the newer revision.|
||||



The user should choose the option ( ) to save the manual revision process. Before save, user has to enter the new revision number of the specific ISO. If the entered ISO Revision number is already exists system will discard the revision number then user has to enter new revision number accordingly. Once the process is finished the system will display the below pop up 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**62 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0062-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0062-05.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0063-01.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0063-02.png)


## **CMC – Construction Method Center** 

_Easy Piping Part 3: Fabrication &Spool Tracking_ 

Page **63 / 156** 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0064-01.png)


Page 

## **CMC – Construction Method Center** 

**64 / 156** 

## **7. FABRICATION MODULE** 

The Fabrication module is organized in 4 different sections corresponding to the different site activities. These sections allow the user to plan & prepare the workload and record the Progress for each activity. The user can also generate the fabrication reports from this screen. All the sections and its uses are defined clearly in the below details. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0064-07.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0064-08.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**65 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0065-02.png)


Page 

## **CMC – Construction Method Center** 

## **DIFFERENT SECTIONS DURING FABRICATION PHASE** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0065-06.png)


**----- Start of picture text -----**<br>
Fabrication<br>Spool fabrication  Welding  NDE  Painting<br>Preparation  Progress  Preparation  Progress  Preparation  Progress  Preparation  Progress<br>**----- End of picture text -----**<br>


## **SPOOL FABRICATION** 

This screen contains two different sections which is preparation and progress. The preparation screen allows the user to plan and prepare the workload. The progress screen consists of several steps that user needs to follow. There can be some additional steps which shall be added if it is required for a project (Refer to Para 1.1).Definition of each step has to be agreed in the initial stage of the project 

- Start fab 

- Material Check 

- Fabricated 

- QC release 

- Sent to paint 

- Painted 

- Final QC 

- Laydown 

## 7.1 

## **Start Fab** 

The user needs to update this step as soon as the spool has been started to fabricate, once this field is updated the user needs to generate the QC-13 Form 

The user can generate the QC forms in two methods. 

1. Using search method – User can search for single Iso and spool 

2. Using Excel Import method – User can List upto Max 50 spools in excel and generate the forms 

- QC-13 form is the daily progress report form, at spool level. It should be generated right after “start fab” date has been recorded 

- The QC Form should be duly filled by workers about the details of the shop joints for the selected spool 

   - Material traceability 

   - Welding 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**66 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0066-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0066-05.png)


## 7.2 **Material Check** 

In the weld progress screen, the user can access the “material traceability” pop-up window. The user will enter the heat numbers filled in the QC – 13 forms by foreman. Easy piping will validate the entered heat numbers which are predefined in the project referential. (Refer to Para 3.12) 

When heat numbers are correctly recorded, the “material check” status of the corresponding spools will be automatically updated. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**67 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0067-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0067-05.png)


## 7.3 **Weld Progress** 

In the fabrication module, the weld progress screen will shows only shop joints only. Welding progress is filled in the QC-13 form, and then the progress is recorded in easy piping in the weld progress screen. The system validates the Information of welders which are predefined in the project referential. (Refer to Para 3.7) The system will validate the information of WPS recorded against the welder with the welder qualifications which are predefined in the Project referential.(Refer to Para 3.6) The system will alert the user if he records the incorrect information. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0067-08.png)


The following are the weld progress columns for which the user needs to fill in this screen 

- Cutting Date – User to input the date 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0068-01.png)


Page 

## **CMC – Construction Method Center** 

**68 / 156** 

- Beveling Date – User to input the date 

- Fit-up Date – User to input the date 

- Preheat Date – User to input the date 

- Weld Date – User to input the date 

- DWIR No. – User to input the QC Form No 

- Subcontractor – Read Only 

- Rework Code – User to select from dropdown 

- Weld Point No. – User to input the number 

- WPS No. – User to input the WPS No. 

- • Welder Code – User to input the Welder code 

If the joint is progressed by only 1 welder (i.e., if there is only 1 weld point), then the user can enter the progress details in the same screen. 

If the joint is progressed by more than 1 welder (i.e., if there are more than 1 weld points), then the user has to click the icon upon which a pop-up is displayed to the user for entering the weld point details. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0068-16.png)


## Note: 

- In the pop-up screen, when the user enters the progress information for the first weld-point and saves, the same WPS No. will be automatically loaded in read-only mode for entering the progress information of the second weld-point. 

- In the pop-up screen, when the user enters the progress information for the first weld-point and saves, the user has to enter a different welder code for the second weld-point. The system will validate the welder code. 

- In the pop-up screen, Root and Cap are mandatory fields. The total of Root and Cap for a joint should be 100. The total of Heat and Fill for a joint can be 0 or 100. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**69 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0069-02.png)


Page 

## **CMC – Construction Method Center** 

- Modification of WPS No, Welder code is not allowed for those weld-points that are selected for examination in any of the batches OR already examined. 

## 7.4 **Fabricated** 

This step will be updated once the dimensional check is finished and all the information is validated and signed by the concerned persons and then spool is considered as “Fabricated” 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0069-08.png)


## 7.5 **QC Release** 

This step will be updated only when all the joints of the particular spool are NDE completed. The user can be able to know the spool release status from the “Spool wise NDE Status” report 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**70 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0070-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0070-07.png)


## 7.6 **Sent to Paint** 

This step will be updated when the QC will declare that the spool is released. The user need to generate the QC form W10P.When the form is signed by the QC. Then the user can update this field. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0070-10.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**71 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0071-02.png)


Page 

## **CMC – Construction Method Center** 

## 7.7 **Painted, Final QC and Laydown** 

The above fields can be updated once all the painting activities are completed. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0071-07.png)


Fabrication Dash Boards 

## **8. IMPORT PROGRESS MODULE** 

The “Import Progress” screen will allow the user to browse for the excel file containing the progress data, based on the generated template. The user will then specify the type of progress data being imported by selecting one of three possible values from a dropdown list: 

- a) Import prefabrication progress. 

- b) Import erection progress. 

- c) Imports weld progress. 

- d) Import Spool Category Definition 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**72 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0072-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0072-07.png)


Note: 

- The format of the template should not be modified in any way. 

- User should not Delete any existing records or Progress against the spools from Prefabrication and Erection Templets. 

- Only date entries are allowed in the progress columns. 

- The progress columns should be entered in the date format dd-MMM-yyyy. 

- The column names should not be modified. 

- New rows should not be added to the template. 

- New columns should not be added to the template. 

## 8.1 **Import Prefabrication process** 

- The progress data in the excel sheet will always supersede progress data in the database. Meaning that if there was a conflict between the data in the excel sheet and the actual data in PSMS, that particular cell will be highlighted in yellow. The user will have to confirm the changes and proceed the import if he wishes. The data in the system will be overwritten with the new data on confirmation. 

- Import of spools which do not exist will be rejected by the system 

The user needs to download the relevant progress template to import the progress. The user can click the option to download the template. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0073-01.png)


Page 

## **CMC – Construction Method Center** 

**73 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0073-05.png)


The user can choose the option and select the progress template and click on to import the progress file. 

The system will validate the import file and the errors are highlighted in red color with appropriate error messages. Import will not be performed unless all the errors have been rectified by the user. The user will be prompted with how to view the validated import file: via Excel or Screen. 

The Excel file will not be able to highlight the errors and overwritten cells in color. However, the error messages will be shown. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0073-09.png)


Once the user will click on , the imported information will be saved in the database. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**74 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0074-03.png)


## **CMC – Construction Method Center** 

## 8.2 **Import Erection process** 

The progress data in the excel sheet will always supersede progress data in the database. Meaning that if there was a conflict between the data in the excel sheet and the actual data in PSMS, that particular cell will be highlighted in yellow. The user will have to confirm the changes and proceed the import if he wishes. The data in the system will be overwritten with the new data on confirmation. 

Import of spools which do not exist will be rejected by the system 

The user needs to download the relevant progress template to import the progress. The user can click the option to download the template. 

## 8.3 **Import Weld Progress** 

Import Weld progress will update weld progress of Joints associated with the Importing template. During import system shall all the validation like Subcon , WPS and Welder authenticity etc information and coverage of Root, Fill and Capping activities. 

If a Joint is already updated as Welded and NDE selection has been done for the joint, then the Joint cannot be editable thro import procedure. 

## 8.4 **Import Spool Definition Category** 

Import Spool Definition Category shall update the User Defined attributes which are created in 

Settings / Admin - > Project Definition -> Project Category Definition 

The export of Template shall export the list of all spools of selected PDS area with Custom defined attributes as column headings. User can update these attributes at spool level and can import. 

Note: All the custom defined attributes are Text fields. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0075-01.png)


Page 

## **CMC – Construction Method Center** 

**75 / 156** 

## **9. FABRICATION REPORTS** 

In this screen the user can generate the fabrication reports. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0075-07.png)


## 9833N_361_Progres 

s_Report_-_Fabricatio This report will provide the progress information of entire fabrication, the user can use several filters like PDS area, Area classification, subcontractor, material type and each Isometric level etc. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0075-10.png)


WeeklyProgressFabri cationReport.xls 

This report will provide the progress information on a weekly and cumulative for the fabrication. The user can use several filters like PDS area, Area classification, subcontractor, material type etc. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0075-13.png)


Summary_Report.xls 

This report will provide the progress information of each spool status including all activities right from material availability to fabrication, painting, erection and RFT supporting etc. 

## **10. SPOOLTRACKING INTRODUCTION** 

The spool tracking module allows the user to the track the location of the spools on site by using the mobile devices (PDA).it is organized in 3 different sections. It is also having a separate dashboard to know the statistics. 

- Data Analysis 

- Barcode Printing 

- Mobile Device Management 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0075-21.png)


## MAIN FUNCTIONALITIES OF SPOOL TRACKING 

- Locate the spools of the project 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**76 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0076-02.png)


Page 

## **CMC – Construction Method Center** 

- Track the history location of the spools 

- Visualize spool images 

- Detect inconsistent scan/records 

- Analyze the tracking data 

- Manage the storage area capacity 

- Print barcodes 

- Manage the mobile devices 

## 10.1 **Overview of Dashboard** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0076-13.png)


## Tracking 

- Cumulative percentage of spools scanned (total spools with at least one scan / total of spools of the project) 

- Number of spools currently related to the spool tracking functionality (Easy piping status from “Start Fab” to “Erected”) + trend 

- Average count of synchronization PDA-Computer per day, during the last week + trend 

- Curve representing the quantity of spools scanned during the running month 

## Usage analysis 

- Spools scanned out from the fabshop (in red) among all the fabricated spools (according to easy piping status) 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**77 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0077-02.png)


Page 

## **CMC – Construction Method Center** 

   - Repartition of the spools in different areas right after their fabrication 

- Spools scanned in the paintshop (in red) among all the painted spools (according to easy piping status 

- Area capacity mapping 

   - Map of the locations, filled with the current spool quantities stored versus the location capacity 

## 10.2 **Data Analysis** 

The user can search by isometric or by barcode 

- Isometric search allows displaying the first spool of the isometric. The user can then scroll between the other spools of the isometric 

- Barcode search allows displaying the corresponding spool. The user can then go to the isometric level by clicking on the isometric number 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0077-12.png)


- Details of the searched spool 

   - Location, duration and tracking history 

   - Spool description (material, WBU etc.) 

   - Spool image 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**78 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-02.png)


Page 

## **CMC – Construction Method Center** 

The user can modify manually the current location of the spool by clicking on Icon, It will create a new record 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-06.png)


The user can also print the spool details by clicking on 

Icon, 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-09.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-10.png)


The user can use these icons 

as a search options. 

In the below screen, The location tab allows the user to visualize all the locations defined in the project referential (Refer to Para 3.23) 

When the user clicks on the any of the location, It will display the list of the spools belongs to the selected location. 

- Spool detail (isometric, spool and barcode number) 

- Duration in this location 

- Flag in case of inconsistency 

The user can also click on the tabs Isometric no,Spool no and Barcode to view the details of that particular selection. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-19.png)


The user can also print the spool details by clicking on Note: Erected spools are not displayed. 

Icon, 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0078-22.png)


In the below screen, the design area tab allows the user to view the location of the spools of a selected design area. 

When user selects any design area, It will displays the 

- The list of locations 

- The list of spools 

- An image of the design  area 

The user can also print the spool details by clicking on Icon, Note: Erected spools are not displayed. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**79 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0079-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0079-05.png)


## CONSOLIDATED REPORTS 

Two types of consolidation reports are available: inconsistencies and transit out 

• “Inconsistencies” are flagged when the easy piping status of a spool and its location are not matching Example: a spool is painted, and it is still located in the fabshop Erected spools, which have a location, scan after their erection date will be considered as inconsistent 

• Transit out are flagged when a spool is scanned OUT a location, but not scanned IN somewhere else The flag will come only if the spool is out a location during more than two days 

The user can also print the spool details by clicking on Icon, 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0080-01.png)


Page 

## **CMC – Construction Method Center** 

**80 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0080-05.png)


## 10.3 **Barcode Printing** 

- The barcode printing functionality allows the user for the creation of spool list (excel format) 

- This list will be used to print the barcode itself in another software (Zebra) 

- The user can search some spools (section in the left) and add them to a basket (section on the right) 

- Search is done by isometric or barcode number 

- The user can click on the to export an excel sheet, filled with the list of spools located on the section on the right 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0081-01.png)


Page 

## **CMC – Construction Method Center** 

**81 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0081-05.png)


## 10.4 **Mobile Device Management** 

The mobile device management functionality allows the user to analyze the use of PDA on site All the PDA Devices and PDA users are defined in the Easy piping referential (Refer Doc EP_Setup) and those will be displayed in this page. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0081-08.png)


The user can also print the spool details by clicking on 

Icon. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0081-11.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0082-01.png)


Page 

## **CMC – Construction Method Center** 

**82 / 156** 

## 10.5 **Offline Synchronization of PDA data** 

PDA Synchronization can be done in 2 methods. 

1. **Online Synchronization** : Online synchronization is, if user in resides with in Technip network PDA data can be synchronized directly to easy piping database so that PDA data shall be loaded directly to database and Vice versa. 

2. **Offline Synchronization :** Offline synchronization is a method of Synchronising the PDA data in outside Technip network where he has no access to Technip network. 

There are 2 steps in involved in this method. 

- 2.1 **Import PDA data to Easy Piping** : This step helps user to import data from PDA to Easy piping. 

Easy piping has ability to import the file in both Excel and .txt files for this import. To generate excel 

template press button to download the excel template. This process can be useful if there are no PDAs are available and spool tracking has been doing manually. 

If PDAs are available a text (.txt) shall be generated by PDA with all scanned data. After synchronising the PDA with computer a Text file shall be generated. This text file will be located at 

- (C:\Kalipso Project Updates\TR0001\ToPC) folder. User need to Import this file to Easy piping. 

The Import option is provided in easy piping at 

## **Easy piping -> Import - > Import spool Tracking data** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0082-17.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0083-01.png)


Page 

## **CMC – Construction Method Center** 

**83 / 156** 

After browsing the file location press import button. System shall import and do the validation check for any inconsistencies. At the end of validation check following message box shall appear to review the validation results. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0083-06.png)


Click on “Export” button to check if any inconsistencies are there. If any, correct them and reimport the file again. If all data has been validated without any inconsistencies then press “import” button to import the data to easy piping. User can view the data update in Data Analysis tab of Spool tracking. 

- **2.2 Export Easy piping data to PDA :** This step export all the files which are required to update PDA from Easy piping. User can export the list required files through Reports module. 

**Easy piping - > Reports - > Data Dump - >Spool Tracking** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0083-10.png)


Spool Tracking export shall export 3 Different report which are essential to update PDA. 

1. Active Spool List : Active spool list shall export all the list of spools which are Active. Active spools are defined as spools for which “Start Fab” date is not null and “Erection date” is null. So any spool for which fabrication is not started or erection is completed is not considered as Active spools. 

2. Sub Locations : List of locations 

3. PDA user : List of PDA users. 

## **Note : Offline synchronization can be done only by System Admin and Project Admin. Other role user cannot Import or export the PDA data.** 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0084-01.png)


Page 

## **CMC – Construction Method Center** 

**84 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0084-05.png)


## _Easy Piping Part 4: NDE Management_ 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0085-01.png)


Page 

## **CMC – Construction Method Center** 

**85 / 156** 

## **11. NDE MANAGEMENT** 

The NDE (Non Destructive Examination) Management is one of the important modules in Easy Piping. This module helps the user to manage all the NDE activities throughout the operational phase. This module is organized in two different sub modules preparation and progress. This screen will appear in both Fabrication and Erection modules.  This modules contains different sections as mentioned below 

- Batch Status 

- Batch Management 

- NDE 100 

- Joint to select 

- Issue Examination process 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0085-12.png)


## **What is a Batch?** 

The batch concept is to manage the NDE activities for “Spot or random examination of 10 or 20% refers respectively to 1 or 2 welds done among 10 weld joints which are entirely examined on the whole circumference for each welder” 

A batch of weld is made by grouping the welds executed by one welder belonging to a particular NDE category 

- Easy piping will create the batch as soon as the weld progress information is recorded. It will take the required NDE% from the NDE matrix which is defined in the project referential (Refer to Para 3.9) based on the progressed weld points, weld type, location and piping class. According to the retrieved NDE %, Welder no and location, System will allocate into different batches. 

- If the batch already exists.  Then system gets the no. of weld points already in the batch. If it is lesser than the size of the batch (10 or 20 depending on NDE %), then the weld point will be added to the batch with status “S” and batch status ‘Joint to Select’. If the batch has the required no. of weld points then a new batch is created with the same characteristics and the weld point will be added to the new batch with status “S” and batch status ‘Joint to Select’. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0086-01.png)


Page 

## **CMC – Construction Method Center** 

**86 / 156** 

- If a weld point is added to a batch where 4 or more weld-points are rejected, its status will be “SS” because it needs to be tested 100%. Batch status is ‘Awaiting NDE’. 

## 11.1 

## **Batch status** 

This module helps the user to view the lists of different weld-points of an ISO and displays the batch no. to which it belongs for all examinations. It also helps the user to identify the batch status by color coding defined in the screen. 

The batch status of the batch can be identified by viewing the color code. 

- Red – Joint to Select 

- Orange – Awaiting NDE 

- Green – Released 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0086-13.png)


The user can click on the batch to perform all the actions of a batch. As soon as the user clicks on the batch it will show all the joints related to the batch in the same screen. Easy piping will suggest a joint to select for the user to select, the user can select the same joint or he can choose any other joint of his choice. After the selection of joint the status will change from “S” to “SS” 

Legend for Joint Status is as follows 

“S” – Joint to be selected 

“SS – Joint selected and awaiting examination 

“NR” – Joint Examination result updated 

“?” -  Selection of joints completed in a Batch 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0087-03.png)


Page 

## **CMC – Construction Method Center** 

**87 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0087-07.png)


The user can use the Icon ( ) to save the selected joint. 

## 11.2 **Batch Management** 

This module helps the user to view the list of batches defined by the Easy Piping. The user can also view the No of joints to select per NDE category in the dashboard section in the same screen. There is an advanced search which helps the user to filter the list of batches based on the following criteria 

- NDE Category 

- Welder No. 

- Location 

- Status 

- Batch number 

- Sub-Contractor 

Status could be one of the following: 

- Released 

- Awaiting NDE 

- Joint to Select 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0088-01.png)


Page 

## **CMC – Construction Method Center** 

**88 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0088-05.png)


The user can click on the batch to perform all the actions of a batch. As soon as the user clicks on the batch it will show all the joints related to the batch in the same screen. 

Easy piping will suggest a joint to select for the user to select, the user can select the same joint or he can choose any other joint of his choice. After the selection of joint the status will change from “S” to “SS” and if the user unselect the joint then the status will change from “SS” to “S” 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0089-03.png)


Page 

## **CMC – Construction Method Center** 

**89 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0089-07.png)


If a selected joint of a batch is accepted. All the other joints of the batch status will be changed to NR and it will disable for selection. The system will show the status of batch as “Released” 

If a selected joint of a batch is rejected, the status for the particular joints is changed to NR and the other joints will be changed to “T1”, Easy Piping will suggest 2 tracers for the user to select. The user can select the suggested tracers or any other tracers for the batch. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**90 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0090-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0090-07.png)


Once the user selects the first tracer, the status of that particular joint is changed to T1S and the system shows the status of other joints as T2, after the selection of the second tracer, that particular joint status is changed to T2S and other joints status will be changed to “?” 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0090-09.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0091-01.png)


Page 

## **CMC – Construction Method Center** 

**91 / 156** 

If any of the selected tracers are rejected, The user is required to select another 2 tracer for rejected joint. Easy Piping will suggest 2 more tracers to select, the user can select the same joints or any other joints from the batch. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0091-06.png)


The user needs to follow the same principal as followed for the 1[st] lever tracers to complete the batch. The user can use the Icon ( ) to save the selected joint. 

Legend for Joint Status is as follows 

- “S” – Joint to be selected 

- “SS – Joint selected and awaiting examination 

- “NR” – Joint Examination result updated 

- “?” -  Selection of joints completed in a Batch 

- T1, T2, …. – Tracers in the first level 

- T1S, T2S …… - Selected tracers in the first level 

- T1-1, T1-2, T2-1, T2-2, …. – Tracers in the second level 

- T1-1S, T1-2S, T2-1S, T2-2S – Selected tracers in the second level 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0092-02.png)


## **CMC – Construction Method Center** 

**92 / 156** 

Note: 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0092-06.png)


- If there are any weld-points in a batch that has a sibling, it will be indicated by an icon. 

- If there are any weld-points in the batch that are rejected in any other batch, that particular weld-point will be disabled. 

- If there are any weld-points in the batch that have related weld-points in any other batch that are rejected, then that particular weld-point will be disabled. 

- If 4 or more weld-points in a batch are rejected, then all the weld-points in the batch should be examined 100%. All the weld-points get automatically selected with status “SS”. Any new weld-points that are added to this batch will automatically get selected and have status “SS”. Status of the batch is “Awaiting NDE”. 

- If any 2[nd] level tracer of a batch is rejected, then all the weld-points in the batch should be examined 100%. All the weld-points get automatically selected with status “SS”. Any new weld-points that are added to this batch will automatically get selected and have status “SS”. Status of the batch is “Awaiting NDE”. 

## 11.3 **NDE 100** 

This module helps the user to select the joints which required 100% NDE for all the categories like (RT, MT, and PWHT etc.) The user can also view the No of joints to select per NDE category in the dashboard section in the same screen. In this module there is and advanced search which helps the user to unselect the joint and roll back the progress which was recorded mistakenly by the users. This will be for limited users like “System admin” or ‘Project admin” 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0092-14.png)


The user needs to select any category of NDE  from the dropdown and search for the joints. 

The user can use Icon to view the list of joints to select. The user can select any desired joint or he can select all the joints . the status of the joint will be “H” If it is not selected and the status of the joint will change to “HS” once it is changed. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0093-01.png)


Page 

## **CMC – Construction Method Center** 

**93 / 156** 

In this screen the user can see all the joints which required 100% NDE as per the NDE matrix and also the joints created by Easypiping R1, R2, R3 as a suffix for the mother joint which is rejected. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0093-06.png)


Notes: 

- When the joint is “ACCEPTED”, the weld-point will no longer be displayed in this screen. 

- When a weld-point is selected, any related weld-points of the selected weld-point also get selected automatically and its status changes to ‘HS’. 

## 11.4 **Issue Examination Process** 

This module helps the user to List out the joints to be examined for a specific NDE category. When the users select all the joints in the “NDE 100” or “Joint to select” all the joints will be viewed in this screen. 

The user can issue the joints by selecting the desired joints or he can select all the joints by selecting check all. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0094-03.png)


Page 

## **CMC – Construction Method Center** 

**94 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0094-07.png)


Notes: 

- The user can use Icon to print all the listed joints to Issue for examination 

- The user can use Icon to export all the listed joints into an excel format to issue for examination 

## 11.5 **Examination Progress** 

This module helps the user to update the examination results for the selected welds to the different categories of NDE .The user can update the progress by “Manually” and “Import procedure” as well. 

The user can search the desired spools and welds by the different search options available on the screen. 

- Search by Isometric 

- Search by Barcode 

There are different tabs for the different NDE categories to update the examination result. Note: 

- Only the welds that are selected in the ‘Batch Management’ and NDE100 screen for all NDE category examination will be enabled for entry. It will be disabled for all the  other welds 

- If a weld has more than 1 weld-point, user has to click on which will open a popup where the user can enter the examination results of all weld-points. 

- Once the progress is recorded for weld-points in the examination progress screen. results will be disabled and modification will not be possible except for the following fields: 

   - RT Rep. RT Date, Rejected Films, Defect Code, Location of Defect. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**95 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0095-02.png)


Page 

## **CMC – Construction Method Center** 

- If any of the weld-points are rejected, new revision of the rejected weld-point is created with suffix R1. For further revision R2, R3, etc. These newly created welds because of revision will be tested 100% for RT examination. It will appear in the NDE 100 module. 

- If any of the weld-points of a weld is rejected, then the entire weld will be displayed as rejected. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0095-07.png)


## **Import procedure for NDE Examination Progress** 

This module helps the user to import all the Examination progress into the system. In this module the system allows the user to generate a template, this template is duly filled by the user and import the same template into the system. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

**96 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0096-04.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0096-07.png)


The user can use the Icon to download the template and fill the template with the relevant information 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0096-09.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**97 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0097-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0097-05.png)


The system will allows the user to browse the file, the user can use the Icon 

and select the Import file and 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0097-08.png)


all the information is imported into the system. 

Note 

- System will allow .xls or .xlsx files only 

- Empty file is not allowed 

- ISO number, spool number, weld number, ISO Revision number, spool revision number which do not exist will be rejected by the system. 

- Import of welds should have weld progress date otherwise rejected by the system. 

- Import of welds and NDE Type which do not exist will be rejected by the system, along with the error message - InValid NDE Type 

- Duplicates values are not allowed 

The system will validate the information provided by the user and the system will highlight the errors in red with the appropriate error messages. Import will not be performed unless all the errors have been rectified by the user. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0097-18.png)


The user will be prompted with how to view the validated import file: via Excel or Screen. 

The Excel file will not be able to highlight the errors and overwritten cells in color. However, the error messages will be shown. If the user selects to view the validations in the screen. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

**98 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0098-02.png)


Page 

## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0098-05.png)


## 11.6 **Client Examination Progress** 

This module helps the user to update the NDE examination progress for the welds from the two categories 

   - Batch is cleared and an additional joint need to be tested in that batch. 

   - Not defined in the NDE Matrix, but the client/QC inspector calls for NDE examination 

- The user can search the desired spools and welds by the different search options available on the screen. 

   - Search by Isometric 

   - Search by Barcode 

The user can view two tabs available in this screen as follows 

- Update Client Examination Progress 

- View Client Examination Progress 

In the “Update Client Examination progress” tab the user can update the progress for any joint that has been selected. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**99 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0099-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0099-07.png)


## Note: 

- If a weld has more than 1 weld-point, user has to click on which will open a popup where the user can enter the examination results of all weld-points. 

- Once the progress is recorded for weld-points in the examination progress screen. results will be disabled and modification will not be possible except for the following fields: 

   - RT Rep. RT Date, Rejected Films, Defect Code, Location of Defect. 

- If any of the weld-points are rejected, new revision of the rejected weld-point is created with suffix R1. For further revision R2, R3, etc. These newly created welds because of revision will be tested 100% for RT examination. It will appear in the NDE 100 module. 

- 

   - If any of the weld-points of a weld is rejected, then the entire weld will be displayed as rejected. 

- The client requested joints will be highlighted in orange color in the Batch management screen for easy identification. 

- 

- Tracer management is not handled 

In the “View client examination progress” tab, user can view all the updated progress in a read only mode 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **100 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0100-02.png)


## **CMC – Construction Method Center** 

## 11.7 **Fabrication Dash Board** 

Fabrication Dashboard provides graphical representation of progressed quantities and backlogs for various Fabrication activities at Spool level and Joints level. Various Filter option are provided to customize the filters for user convenience. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0100-06.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0100-07.png)


**----- Start of picture text -----**<br>
Filters<br>Feed Stock<br>KPI of Progress<br>Joint Fabrication<br>**----- End of picture text -----**<br>



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0100-08.png)


**----- Start of picture text -----**<br>
Spool Fabrication<br>**----- End of picture text -----**<br>


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0101-01.png)


## **CMC – Construction Method Center** 

Page **101 / 156** 

## **11.7.1 Filters** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0101-05.png)


Filters provided to customise the search criteria for user convenience.  This option shall enable user to view the progress and backlog quantities in terms of Dia- inch, No of spools or Tons Etc. The Main option in the Filters are 

## **Global Filters :** 

1. Time scale : Facilitates user to select specified time period or predefined time. 

2. WBU 

3. Design Area ( PDS Area ) 

4. Material Type 

5. Size Range 

After selection of Global filters user need to Click on button to apply filters on Graphs. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0101-14.png)


Print option is provided to print the graph with selected filters. 

## **Spool Fabrication Progress Filters:** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0101-17.png)


1. Backlog  : Provide the information Backlog for each and every activity of Spool Fabrication progress at Spool Level. 2. Amount :Display the periodic  values ( Bar chart) 

3. Cumul : Display the overall values ( Line chart) 

4. Values or % : Display the values of progress  % of Total scope. 

5. Spools, Tons or Dia Inch : Display the values of in No of spools or Tons or Diaincah ( Spool level Shop Scope) based on the selection. 

## **Joint Fabrication Progress Filters:** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0101-23.png)


1. Backlog : Provides the information of Backlog for all activities of Joint fabrication and NDE process.  ( Note: Backlog for NDE progress shall not be displayed if other filters are on except Time filters) 

2. Amount :Display the periodic  values ( Bar chart) 

3. Cumul : Display the overall values ( Line chart) 

4. Values or % : Display the values of progress  % of Total scope. 

5. Joint or Dia  inch : Displays the values in No of Joints wise of Dia- inch wise 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **102 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0102-02.png)


## **CMC – Construction Method Center** 

## **11.7.2 Spool Fabrication Chart :** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0102-05.png)


Spool Fabrication chart provides progress and backlog information for following Activities at Spool level. 

1. Material Availability 

2. Fabricated 

3. QC Release 

4. Painted 

5. Final QC 

User can switch the visibility of Activities. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0102-13.png)


By Clicking the above icons user can show or hide the activity. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **103 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0103-02.png)


## **CMC – Construction Method Center** 

## **11.7.1 Spool Fabrication Feed Stock Quantities and KPI :** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0103-05.png)


Spool Fabrication Feed stock Quantities represent the overall Scope and Feed stock availability data. 

1. Feed stock quantities always display the overall quantities, So Time Filters in global filters  are not applicable. 

2. Total Spools always represent the overall scope of the project. 

3. All the values can be displayed in Spool , Tons or Dia Inch based on the selection in the Spool Fabrication filter 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0103-10.png)


**KPI For Spool Fabrication : KPI** represents avg time taken for each activities based on historical data of the project. 

## **11.7.2 Joint Fabrication Chart :** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0103-13.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **104 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0104-02.png)


## **CMC – Construction Method Center** 

Joint Fabrication chart provides progress and backlog information for following Activities at Joint level. These values are represents only Shop Joints for which the Dia-Inch Factor is “Yes”. 

1. Material Availability 

2. Welding 

3. PWHT 

4. RT 

5. PR 

6. MT 

7. PMI 

8. HT 

User can switch the visibility of progress  by clicking the Following button on the Graph : 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0104-14.png)


## **11.7.3 Joint Fabrication Feed Stock Quantities and KPI:** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0104-16.png)


Joint Fabrication Feed stock Quantities represent the overall Scope and Feed stock availability data. 

1. Feed stock quantities always display the overall quantities, So Time Filters in global filters  are not applicable. 

2. Total joints always represent the overall scope of the project. 

3. All the values can be displayed in No of Joint or Dia-Inch based on the selection in the Spool Fabrication filter 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0104-21.png)


**KPI For Welder Performance : KPI** represents the overall Avg Dia Welded by a welder per day. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **105 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-02.png)


## **CMC – Construction Method Center** 

## 11.8 **NDE Reports** 

Easy Piping will allow the user to see certain reports related to the NDE which explained below in detail. The user can access the reports from the same screen or a separate tab which is only for all the reports. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-06.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-07.png)


Welders_Perf_Contr ol_Sheet.xls 

Welders_Perf_ Control Sheet:  gives for each welder weekly and cumulative statistics on percentage / number of joints welded accepted /rejected and type of defects 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-10.png)


## WelderwiseRejected 

andTracersJoints.xls Welder wise rejected and tracer joints: It will list all the rejected joints with the corresponding Tracers. Used to track backlog in penalty shoot. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-13.png)


## WelderwiseRejected 

andRepairedJoints.xls Welder wise rejected and repaired joints: It will list for each welder the joints to be repaired - repaired. Used to track backlog in repairs. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0105-16.png)


WelderwiseBatchStat us.xls 

Welder wise batch status: It will gives examination status for a welder 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-01.png)


## **CMC – Construction Method Center** 

Page **106 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-04.png)


Welders_Production. xls Welders Production: It will give the production report for the certain selected period for a selected welder or all welders during that period. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-06.png)


9833N_4941_Batch_ 

Status_Report.xls Batch status: It will gives released status of each welds regarding NDE 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-09.png)


Radiographic_Film_St atus_Report.xls Radiographic status: It will give statistics on percentage / number of joints/films accepted /rejected and type of defects - weekly and cumulative 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-11.png)


Outstanding_Repairs _Report.xls Outstanding Repairs: list all the joints to be repaired with all necessary details, including pending days 

since NDE done 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-14.png)


Service_Class_wise_ NDE_Status_Report.x Service class wise NDE status: gives NDE status for each piping class. Used to check examination percentage compliance 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-16.png)


Spool_wise_NDE_Sta tus.xls Spool wise NDE status: It will list all spools status regarding NDE, spool is Qc released or not and display the corresponding QC and W10 report number 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-18.png)


Outstanding_NDE.xls 

Outstanding NDE:  lit all the joints awaiting NDE reports, including pending days since requested.  Used for NDE backlog tracking 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0106-21.png)


Radiographic_Film_E stimated.xls Radiographic film – Est. qty: It will give an estimated quantity of radiographic films to be shoot. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0107-02.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0107-03.png)


## **CMC – Construction Method Center** 

## _Easy Piping Part 5: Erection Module_ 

**107 / 156** 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**108 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0108-03.png)


## **CMC – Construction Method Center** 

## **12. ERECTION MODULE** 

The Erection module is organized in 4 different sections corresponding to the different site activities. These sections allow the user to plan & prepare the workload and record the Progress for each activity. The user can also generate the Erection reports from this screen. All the sections and its uses are defined clearly in the below details. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0108-07.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**109 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0109-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0109-07.png)


## **ARTICLE I. DIFFERENT SECTIONS DURING ERECTION PHASE** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0109-09.png)


**----- Start of picture text -----**<br>
Erection<br>Spool erection  Welding  NDE  Flange<br>Preparation  Progress  Preparation  Progress  Preparation  Progress  Preparation  Progress<br>**----- End of picture text -----**<br>


## 12.1 **Spool Erection** 

This screen contains two different sections which is preparation and progress. The preparation screen allows the user to plan and prepare the workload. The progress screen consists of several steps that user needs to follow. There can be some additional steps which shall be added if it is required for a project (Refer to Para 1.1).Definition of each step has to be agreed in the initial stage of the project 

- To Site 

- Erected 

- Welded/Bolted 

- Supported 

- RFT 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **110 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0110-02.png)


## **CMC – Construction Method Center** 

In order to update progress for the above steps in Easy piping, the users have to follow the QC form (W-24 Form) The user can generate the QC forms in two methods. 

3. Using search method – User can search for single Iso and spool 

4. Using Excel Import method – User can List upto Max 50 spools in excel and generate the forms 

- W-24 form is the daily progress report form, at spool level. 

- The QC Form should be duly filled by workers about the details of the Field joints for the selected spool 

   - Material traceability 

   - Welding 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0110-11.png)


## 12.2 **Material Check** 

In the weld progress screen, the user can access the “material traceability” pop-up window. The user will enter the heat numbers filled in the QC – 13 forms by foreman. Easy piping will validate the entered heat numbers which are predefined in the project referential. (Refer to Para 3.12) 

When heat numbers are correctly recorded, the “material check” status of the corresponding spools will be automatically updated. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**111 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0111-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0111-07.png)


## 12.3 **Weld Progress** 

In the Erection module, the weld progress screen will show only the field joints. Welding progress is filled in the W-24 form, and then the progress is recorded in easy piping in the weld progress screen. The system validates the Information of welders which are predefined in the project referential. (Refer to Para 3.7) 

The system will validate the information of WPS recorded against the welder with the welder qualifications which are predefined in the Project referential. (Refer to Para 3.6) The system will alert the user if he records the incorrect information. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0111-11.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **112 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0112-02.png)


## **CMC – Construction Method Center** 

The following are the weld progress columns for which the user needs to fill in this screen 

- Cutting Date – User to input the date 

- Beveling Date – User to input the date 

- Fit-up Date – User to input the date 

- Preheat Date – User to input the date 

- Weld Date – User to input the date 

- DWIR No. – User to input the QC Form No 

- Subcontractor – Read Only 

- Rework Code – User to select from dropdown 

- Weld Point No. – User to input the number 

- WPS No. – User to input the WPS No. 

- Welder Code – User to input the Welder code 

If the joint is progressed by only 1 welder (i.e., if there is only 1 weld point), then the user can enter the progress details in the same screen. 

If the joint is progressed by more than 1 welder (i.e., if there are more than 1 weld points), then the user has to click the icon upon which a pop-up is displayed to the user for entering the weld point details. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0112-18.png)


## Note: 

- In the pop-up screen, when the user enters the progress information for the first weld-point and saves, the same WPS No. will be automatically loaded in read-only mode for entering the progress information of the second weld-point. 

- In the pop-up screen, when the user enters the progress information for the first weld-point and saves, the user has to enter a different welder code for the second weld-point. The system will validate the welder code. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **113 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0113-02.png)


## **CMC – Construction Method Center** 

- In the pop-up screen, Root and Cap are mandatory fields. The total of Root and Cap for a joint should be 100. The total of Heat and Fill for a joint can be 0 or 100. 

- Modification of WPS No, Welder code is not allowed for those weld-points that are selected for examination in any of the batches OR already examined. 

## 12.4 

## **To site** 

This step will be updated by the user from the W-24 QC form. Once the spools are received at site and confirmed by the area supervisor. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0113-09.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0114-04.png)


## **CMC – Construction Method Center** 

**114 / 156** 

## 12.5 **Erected** 

This step will be updated by the user from the W-24 QC form. Once the spools are erected at site and confirmed by the area supervisor. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0114-09.png)


## 12.6 **Welded/Bolted** 

This step will be updated by the user from the W-24 QC form. Once the spools are erected and all the joints of the spools are welded or bolted. 

## 12.7 **Supported** 

This step will be updated by the user from the W-23 QC form. Once all the supported are erected and welded. 

## 12.8 **RFT** 

This step is an automatic update by the Easy Piping system, if all the predecessor steps are completed. 

## 12.9 **ERECTION DASH BOARD** 

Erection Dashboard provides graphical representation of progressed quantities and backlogs for various Erection activities at Spool level, Joints level and Flange Joint . Various Filter option are provided to customize the filters for user convenience. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**115 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0115-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0115-05.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0115-06.png)


**----- Start of picture text -----**<br>
Filters<br>Feed Stock<br>KPI of Progress<br>Field Joint Welding<br>Spool Erection<br>**----- End of picture text -----**<br>


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0116-01.png)


## **CMC – Construction Method Center** 

Page **116 / 156** 

## **12.9.1 Filters** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0116-05.png)


Filters provided to customise the search criteria for user convenience.  This option shall enable user to view the progress and backlog quantities in terms of Dia- inch, No of spools, No of Flange Joints or Tons Etc. The Main option in the Filters are 

## **Global Filters :** 

1. Time scale : Facilitates user to select specified time period or predefined time. 

2. WBU 

3. Design Area ( PDS Area ) 

4. Material Type 

5. Size Range 

After selection of Global filters user need to Click on button to apply filters on Graphs. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0116-14.png)


Print option is provided to print the graph with selected filters. 

## **Spool Erection Progress Filters:** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0116-17.png)


1. Backlog  : Provide the information Backlog for each and every activity of Spool Fabrication progress at Spool Level. 

2. Amount :Display the periodic  values ( Bar chart) 

3. Cumul : Display the overall values ( Line chart) 

4. Values or % : Display the values of progress  % of Total scope. 

5. Spools, Tons or Dia Inch : Display the values of in No of spools or Tons or Diaincah ( Spool level Field Scope) based on the selection. 

## **Joint Filed Progress Filters:** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0116-24.png)


1. All: If user wishes to view the Flange joint progress then he need to select the “All” option in the Dash Board. 

2. Backlog : Provides the information of Backlog for all activities of Joint fabrication and NDE process.  ( Note: Backlog for NDE progress shall not be displayed if other filters are on except Time filters) 

3. Amount :Display the periodic  values ( Bar chart) 

4. Cumul : Display the overall values ( Line chart) 

5. Values or % : Display the values of progress  % of Total scope. 

6. Joint or Dia  inch : Displays the values in No of Joints wise of Dia- inch wise 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**117 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0117-03.png)


## **CMC – Construction Method Center** 

## **12.9.2 Spool Erection Chart :** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0117-06.png)


Spool Erection chart provides progress and backlog information for following Activities at Spool level. 

1. Sent to Site 

2. Erected 

3. Welded & Bolted 

4. Supported 

5. Iso Completed 

User can switch the visibility of Activities. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0117-14.png)


By Clicking the above icons user can show or hide the activity. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **118 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0118-02.png)


## **CMC – Construction Method Center** 

## **12.9.3 Spool Erection Feed Stock Quantities and KPI** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0118-05.png)


Spool Erection Feed stock Quantities represent the overall Scope and Feed stock availability data. 

1. Feed stock quantities always display the overall quantities, So Time Filters in global filters  are not applicable. 

2. Total Spools always represent the overall scope of the project. 

3. All the values can be displayed in Spool , Tons or Dia Inch based on the selection in the Spool Fabrication filter 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0118-10.png)


4. Total Iso : Total No Iso in the Project 

5. Completed for LC : % Iso completed Line check 6. Waiting for LC : No Iso awaiting for Line check 

**KPI For Spool Erection: KPI** represents avg time taken for each erection activity based on historical data of the project. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**119 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0119-03.png)


## **CMC – Construction Method Center** 

## **12.9.4 Joint Erection Chart** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0119-06.png)


Joint Erection chart provides progress and backlog information for following Activities at Joint level. These values are represents only Shop Joints for which the Dia-Inch Factor is “Yes”. 

1. To Site 

2. Erected 

3. Welding 

4. Bolting 

5. PWHT 

6. RT 

7. PR 

8. MT 

9. PMI 

10. HT 

User can switch the visibility of progress  by clicking the Following button on the Graph : 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0119-19.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **120 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0120-02.png)


## **CMC – Construction Method Center** 

## **12.9.5 Joint Erection Feed Stock and KPI :** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0120-05.png)


Joint Erection Feed stock Quantities represent the overall Scope and Feed stock availability data. 

1. Flange Joints scope and Progress 

2. Feed stock quantities always display the overall quantities, So Time Filters in global filters  are not applicable. 

3. Total joints always represent the overall scope of the project. 

4. All the values can be displayed in No of Joint or Dia-Inch based on the selection in the Spool Fabrication filter 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0120-11.png)


**KPI For Welder Performance : KPI** represents the overall Avg Dia Welded ( Erection Joints) by a welder per day. 

## **13. ERECTION REPORTS** 

In this module the user can generate the erection reports from the same screen. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0120-15.png)


ProgressPipingErecti 

on.xls 

This report will provide the erection status for entire project. The user can user several filters like PDS Area, Area Classification, Material type, Subcontractor and LB/SB etc. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0120-19.png)


WeeklyProgressPipin gErection.xls 

This report will provide the erection status on a weekly basis. The user can search for particular period of time. The user can also search by filters like PDS Area, Area Classification, Material type, Subcontractor and LB/SB etc. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **121 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0121-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0121-04.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0122-01.png)


## **CMC – Construction Method Center** 

Page **122 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0122-04.png)


## _Easy Piping Part 6: Testpack &Flange Management_ 

## **14. TESTPACK MANAGEMENT** 

The Test pack module helps the user to manage all the test packs and the process flow of test packages during the project phase. The system allows the user to create and edit the test packages at any stage of the project. This module also helps the user to manage the Flange management (Bolt Torquing).This list of main functionalities are as follows. 

- Test packs Preparation. 

- Test pack review – Edit and revision management 

- Line check Preparation/Progress 

- Item Clearance preparation/Progress(Punch item) 

- Blinding preparation/Progress 

- Reinstatement Preparation/Progress 

- Test pack Explorer – Navigation of status 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**123 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0123-03.png)


## **CMC – Construction Method Center** 

- Tracking reports for construction, Bolting and NDE 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0123-06.png)


## **15. TESTPACK PREPARATION** 

In the Easy piping test packs can be created in two methods manual edit method and import procedure. The user can see this screen under preparation module as “Test pack Builder”. 

## 15.1 **Testpack builder** 

This module helps the user to create a test pack and browse the test packs for review and edit the content if necessary. 

The user can browse in a hierarchical level in this screen 

- System level – The system will show all the test packs related to the searched system 

- Sub system level – The system will show all the test packs related to the searched subsystem 

- Test pack level – The system will show the particular test pack related to the searched test pack 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **124 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0124-02.png)


## **CMC – Construction Method Center** 

Note: After the search results, if the user click on the test pack it will show the details of test pack like isometric and spools. 

The user can start creating the test packs manually by start clicking in the screen. When the user clicks on the system will show a pop-up where the below fields are shown. 

- System 

- Sub-system 

- Test pack No 

- Test plan : date from - to 

- Test pack priority 

- Test pressure 

- Test medium 

- Service class 

- Test pack volume 

- Test pack location 

Once the test pack is added from the pop up the user can search for desired Isometrics and spools and add to the test pack in the same screen. 

In the aforementioned fields, System, subsystem and service class are predefined referential (Refer to Para 3.19, Para 3.20, Para 3.25) 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0124-18.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **125 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0125-02.png)


## **CMC – Construction Method Center** 

The user can use the option to edit any parameters for the existing test pack. The system will display a pop up as “Edit Test package” with existing parameters and user can edit the parameters and add the new spools if any, 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0125-05.png)


The user can use the options after the editing is completed. The user can also delete the inappropriate data if any by using the option 

## 15.2 **Testpack import** 

This module also helps the user to Import the test pack details through import procedure. System allows the user to generate the test pack template where users have to fill the required data and import into the system. When the user clicks on system will display a popup with two types of templates. The user can choose the type of test pack he wants to use 

Empty Template – It will the empty template with no data related to test packs. 

Test pack list – It will give the total list of test packs which are previously assigned. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **126 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0126-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0126-06.png)


The user needs to fill the following details in the template before import. 

- System 

- Subsystem 

- Test Pack 

- Test pack rev 

- Test Medium : Dropdown list H, P or V 

- Test Pressure (Editable) 

- Test plan date (Editable) 

- Iso No (Read only field) 

- Rev (Read only field) 

- Spool number (Read only field) 

- Spool revision (Read only field) 

- Test pack Location 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**127 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0127-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0127-05.png)


The user can choose the option to import the test pack template once it is filled. Notes: 

- Import of iso / spools which are not defined in PSMS will be rejected by the system 

- Date column should have the following date format (dd-MM-yyyy). 

- To add an additional spools to an existing test pack it should be done manually the system will display the message “To add additional spools manually” 

- The data in the excel sheet will always supersedes data in the database. Meaning that if there was a conflict between the data in the excel sheet and the actual data in Easy Piping that particular cell will be displayed with the errors. The user will have to confirm the changes and proceed the import if he wishes. The data in the system will be overwritten with the new data on confirmation. 

Failure of any of these rules will be validated by the system and the errors will be displayed with the appropriate error messages. Import will not be performed unless all the errors have been rectified by the user. 

## **16. PRESSURE TEST MODULE** 

This module helps the user to prepare the workload and update the progress for the same. This section is organized into 5 different sections corresponding to different testing activities like 

- Line check 

- Item Clearance 

- Blinding 

- Testing and ProComm 

- Reinstatement 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**128 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0128-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0128-07.png)


- **Each activities is divided in two sub-modules** 

   - Preparation – This module allows the user to prepare the workload 

   - Progress – This module allows the user to enter the progress related to the corresponding activity 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0128-11.png)


**----- Start of picture text -----**<br>
Pressure tests<br>**----- End of picture text -----**<br>



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0128-12.png)


**----- Start of picture text -----**<br>
Testing and<br>Line check  Item clearance  Blinding  Reinstatement<br>precom<br>Preparation  Progress  Preparation  Progress  Preparation  Progress  Progress  Preparation  Progress<br>**----- End of picture text -----**<br>


## 16.1 **Line Check Preperation** 

This module allows the user to assign the line checking activity for the line checkers. The line checkers are predefined in the project referential (Refer to Para 3.21).The user can assign the workload in two different levels 

- Isometric level 

- Test pack level 

The user can search for the Iso or test pack. The system will display the list of Iso’s or test packs which are ready for the line checking based on the criteria 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **129 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0129-02.png)


## **CMC – Construction Method Center** 

- Spools are supported 

- Weld joints are welded 

During the search process the user can use the “Advance search” options which will filters based on the selection. The below mentioned are the following categories 

- Test pack location 

- System and subsystem 

- PDS Area 

- Area Classification 

The user will then select a line checker and assign one or several Iso or test pack to be line checked The user can generate a checking request, in which these Iso or test pack will be listed. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0129-12.png)


## 16.2 **Line Check Progress** 

This module allows the user to update the progress for the line checking activity. Once the assigned test pack is line checking done the user can record the progress. 

The user can search for the test pack or Isometric and fill the following details in this screen. 

- The item numbering is automatic 

- Checking date 

- Category (X, Y or Z) 

- Localization of the item : isometric and spool 

- Punch code 

- Description (will come automatically with the punch code, but can be modified) 

- Punch done by: Punch originator 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**130 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0130-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0130-07.png)


Note: Line check completed date is mandatory to proceed for the next step. 

## 16.3 

## **Item Clearance Preparation** 

This module allows the user to assign the job for Item clearance to the finishing team. The finishing teams are predefined in the project referential (Refer to Para 3.17).The user can assign the workload in two different levels 

- Isometric level 

- Test pack level 

During the search process the user can use the “Advance search” options which will filters based on the selection. The below mentioned are the following categories 

- Test pack location 

- System and subsystem 

- PDS Area 

- Area Classification 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **131 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0131-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0131-06.png)


The user will then select a Finishing team and assign one or several Iso or test pack to complete item clearance. The user can generate a Item clearance request, in which these Iso or test pack will be listed. 

## 16.4 **Item Clearance Progress** 

This module allows the user to update the progress for the ltem clearance activity. Once the assigned test pack is completed item clearance. The user can record the progress. 

The user can search for the test pack or Isometric and fill the following details in this screen. 

- Punch item clearance date 

- Punch cleared by (finishing team) 

Note: Line check completed date is mandatory to proceed for the next step. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**132 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0132-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0132-07.png)


## 16.5 **Blinding Preperation** 

This module helps the user to assign the blinding activity to the blinding team. The blinding teams are predefined in the project referential (Refer to Para 3.16). 

During the search process the user can use the “Advance search” options which will filters based on the selection. The below mentioned are the following categories 

- Test pack location 

- System and subsystem 

- PDS Area 

- Area Classification 

- Date RFT 

The user can generate a blinding request, in which these test packs will be listed. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM 03 0** 

Page **133 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0133-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0133-05.png)


## 16.6 **Blinding Progress** 

This module allows the user to update the progress for the Blinding activity. Once the assigned test packs are blinding done. The user can record the progress. 

The user can search for the test pack and fill the following details in this screen. 

- Blinding date 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0133-10.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **134 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0134-02.png)


## **CMC – Construction Method Center** 

## 16.7 

## **Testing and Pre commissioning progress** 

- Easy piping does not manage the preparation of the testing and pre-commissioning. However, the user can enter the dates related to these activities 

- Testing start date 

- Testing done date 

- Pre-commissioning date 

The user will search for a test pack using the appropriate search field 

These dates are useful to be entered, since it allow to manage the reinstatement activity for the flange joints category Y and Z 

- Category Y : reinstatement to be done after testing and before pre-commissioning 

- Category Z : reinstatement to be done after pre-commissioning 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0134-14.png)


## 16.8 **Reinstatement Preperation** 

This module allows the user to assign some test packs for the reinstatement to the reinstatement team. The reinstatement teams are predefined in the project referential (Refer to Para 3.18). The user will search flange joints (test pack wise) in the search section 

- Only the flange joints Y belonging to a test pack which has been tested will appear 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**135 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0135-03.png)


## **CMC – Construction Method Center** 

- Only the flange joints Z belonging to a test pack which has been pre-commissioned will appear 

The user will then select reinstatement team and assign one or several flange joint to be reinstated The user can generate a reinstatement request, in which these flange joints will be listed 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0135-07.png)


## 16.9 **Reinstatement Progress** 

This module allows the user to update the progress for the reinstatement activity. Once the assigned test packs are reinstatement done. The user can record the progress. 

The user will search flange joints (test pack wise) in the search section 

The user can search for the test pack and fill the following details in this screen. 

- Joint date 

- Report number 

- Jointer No (The jointer numbers are predefined in the project referential Refer to Para 3.15) 

- Tag number 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **136 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0136-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0136-06.png)


## **17. TESTPACK HOMEPAGE** 

The pressure test homepage displays global information regarding the testing activities like Line checking, item clearance, testing and reinstatement 

The bargraph shows the quantities for each activities 

- What is ready to be done: “ready” 

- What has been sent to be done: “ongoing” 

- At test pack, isometric or flange joint level 

On top of the page, some filters and options are available 

 Filters are applied and curves and backlogs 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**137 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0137-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0137-07.png)


## **18. TESTPACK EXPLORER** 

This screen allows the user to access all the information regarding the testing activities in hierarchical levels as follows. 

Clicking on a test pack will make appearing some information at the isometric level. Then, clicking on a isometric will make appearing information at spool level 

   - Test pack level 

   - Isometric Level 

   - Spool Level 

- This screen is organized in 4 different sections as per the test pack follow up and the details are mentioned below • General 

   - Release tracking 

   - Operation Management 

   - Progress Status 

The system will allows the user to see the information based on the below filter also. 

- System No 

- Test pack Location 

- Area classification 

- Subcontractor 

- Priority 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **138 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0138-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0138-06.png)


## 18.1 **General - Testpack Level** 

This screen allows the user to visualize the general information related to the test pack definition. The below mentioned are the details shown in this screen. 

- Subsystem No 

- Test pack No 

- Test pack Location 

- Rev Number (auto generated by the system) 

- Test planned date 

- Test pack Priority 

- Test medium 

- Test pressure 

- Unit of time 

- Volume 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**139 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0139-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0139-07.png)


## 18.2 **Release Tracking - Testpack Level** 

This screen displays all the information useful to know whether a test pack is ready for test or not 

- Quantity of welded joints which have still to be welded 

- Quantity of flange joints which have still to be bolted 

- Quantity of welded joints which have still to be NDE tested 

- Quantity of isometrics to complete, in order to make the test pack ready for line checking (all spools are supported and welded bolted) 

- Quantity of isometrics to be returned from line checking after being assigned in the preparation module 

- Quantity of item category X (to be cleared before testing) from line checking still to be cleared 

- Quantity of isometrics to be QC released for test (all welded joints are NDE/PWHT released) 

- Quantity of isometrics to be Ready For Test (QC released + complete + line check done + all item X cleared) 

All the quantity icons are able to click, when the user clicks on the number the system will display a pop up of the particular screen. User can export the list of work to be done. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page 

**140 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0140-03.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0140-05.png)


Some clickable links are available, in order to reach other easy piping functionality 

- Isometric to send for checking : to line check - preparation 

- Isometric to return form checking : to line check - progress 

- Item x to be cleared : to item clearance - preparation 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0140-10.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **141 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0141-02.png)


## **CMC – Construction Method Center** 

## 18.3 **Operation Management - Testpack Level** 

- This screen displays all the dates and information regarding the blinding, testing and reinstatement activities • Date the test pack is ready for test 

   - Date the test pack is assigned to be blinded 

   - Date the test is done 

   - Quantity of items (categories Y and Z) to be cleared, the date when all items are cleared, and the corresponding units of time 

   - 

- Date pre-commissioning 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0141-11.png)


## 18.4 **Progress Status - Testpack Level** 

This screen displays the percentage of completion of the test pack 

- Construction 

- Line checking 

- Testing 

- Reinstatement 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**142 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0142-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0142-07.png)


## 18.5 **Spool Status - Isometric Level** 

- The user can click on a test pack number, in order to access the isometric level 

- Two tabs are available at this level : “spool status” and “isometric status” 

- To go back to the Higher level, the user has to click on the system – subsystem number 

- The user can also scroll between the different test pack of the sub-system using the arrows 

- The “spool status” tab displays the current status of the spools belonging to the test pack, at the isometric level 

   - A figure identifies the status (example: 12 = Ready For Test) 

   - A tool tip is also provided to indicate the status 

   - A color coding is done, to quickly identify the level of completion (red, orange and green) 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **143 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0143-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0143-04.png)


## 18.6 **Isometric Status - Isometric Level** 

In this screen the system displays information related to isometrics belonging to the test pack 

- Date when the isometric is completed (all spools are supported and welded bolted) 

- Date when the isometric is assigned for line checking 

- Date when isometric is returned from line checking (punch list entry) 

- Quantity of item category X to be cleared 

- Quantity of welded joints still to be welded 

- Quantity of flange joints still to be bolted 

- Quantity of welded joints still to be NDE tested 

- Date the isometric is QC released for test (all welded joints are NDE/PWHT released) 

- Date the isometric is Ready For Test (QC released + complete + line check done + all item X cleared) 

Note: All these information are not based on the isometric itself, but on the spools that really belong to the selected test pack 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **144 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0144-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0144-04.png)


## 18.7 **Spool Status – Spool Level** 

- The user can also click on a isometric number, in order to access the spool level 

- To go back to the upper level, the user has to click on the system – subsystem – test pack number 

- The user can also scroll between the different isometrics of the test pack using the arrows 

- The “spool status detailed” tab displays the detailed current status of the spools belonging to the test pack, and the selected isometric 

- The status of each spool is detailed 

- A color coding is done, to quickly identify the level of completion (red, orange and green) 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0144-12.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **145 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0145-02.png)


## **CMC – Construction Method Center** 

## **19. FLANGE MANAGEMENT** 

This module helps the user to manage the bolt torquing and tensioning activities related to the flange connections.  The flange management is interrelated to the test packages. Main functionalities of flange management are as follows: 

- Numbering and quantifying works. 

- Identify joints to be performed before test or after test and so the requirements of                 permanent or temporary gasket for the jointing. 

- Identify method of tightening required. 

- Define torquing values. 

- Records execution progress and traceability if required. 

- Calculating estimations of number of jointing to forecast and anticipate the required resources 

- Editing the torquing program and all reports necessary for backlog tracking 

- Compiling records of jointing, jointers, in order to edit history sheet for test packs (if required) 

The flange management functions in different stages as follows 

- Import bolting report data 

- Revision management and flange browse 

- Progress import of bolting 

## 19.1 **Import Bolting Report Data** 

A dedicated screen in Easy piping is handling the import process, in which the user will browse to select the file to be imported, the file will strictly following the agreed template, otherwise, Easy piping will not be able to interpret the file and import the data appropriately 

Easy piping will show the imported data in a preview pane before doing the actual import to the database. At this point, Easy Piping will validate the data, and alert the user if inconsistencies are reported. The user will check the consistency of the data and will chose to proceed. 

Importing rules are: 

• Easy piping will validate whether the Spool data (including revision) that is being imported already exists in the database. If not, the import process will notify the user that corresponding weld sum data does not exist and invite the user to import it. 

• Diameter size that will be provided in fractional format will be converted to decimal format by the system. For ex: The acceptable format in the import file for fractional numbers is 2.1/2. This will be read by the system as 2.5. 

• The value of the “BT No.” should be always starting with BT characters. Example: BT1 or BT21. 

• All the columns in the imported text file will be stored as ‘text’ in the database, except for the “Diam” and “Qty” column; the value will be stored as a ‘number’. 

• Easy piping will validate whether the flange rating for the imported joint exist in the rating referential by checking the rating and diam, otherwise an error message will appear. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **146 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0146-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0146-06.png)


## 19.2 **Flange Manual Revision Management** 

The “Flange Manual Revision Management” module allows the user to do Flange Revision management manually. This Flange Revision management will happen without getting revised ‘Bolting Report’ (txt) file from SPOOLGEN. 

A separate screen is available for this module, which comes under ‘Preparation’ menu, and ‘Browse’ tab and subtab named as ‘Flange Manual Revision Management’. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0146-10.png)


When the user click on the search button, a list of Isometrics will be displayed in a grid that satisfies the search criteria. 

From Search list user can select an Isometric for manual revision management. By selecting any one of the Isometric, system will redirect to Flange manual revision management page. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**147 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0147-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0147-07.png)


By default all the Flange joint status is ‘Done without Modification’. The progress information will either be copied to the newer revision of the Flange or not, as explained in the table below: 

||**Status**|**Action**|
|---|---|---|
||Not Done|The user will select this value if there is no progress information. No action<br>to be taken in this case, the newer version of the spool will remain empty,<br>same applies to the weld|
||Cancelled|The user will select this value if the spool has been cancelled. No action to<br>be taken in this case, the spool will not appear in the newer revision.|
||Done, but<br>revised w/o<br>modification|This value refers to Spools which are fabricated in the older revision, but<br>the newer version of the spool hasn’t changed, so the progress information<br>of the older revision will be copied to the newer revision. Weld progress<br>information of the older revision will also be copied to welds in the newer<br>revision. The‘Spool Revision No.’will remain the same.|



## Note: 

- In the below screen, all the fields are mandatory, the user have to fill all the details. 

- The value of the “Bolt No.” should have minimum three characters. Example: BT01 

- Bolt No should start with ‘BT’. 

- PSMS will check whether there are duplicate Flange joints (same Bolt no.). If duplicates exist, an error message will appear against the particular Flange joint. 

- Dia inch, Bolt Size and BoltQty accept only numeric values, otherwise system will validate. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**148 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0148-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0148-07.png)


## **Save Flange Manual Rev Management** : 

Before save, user has to enter the new revision number the specific ISO. If the entered ISO Revision number is already exists system will discard the revision number then user has to enter new revision number accordingly. 

## **19.2.1 Browse Flange** 

This module allows the user to navigate in a hierarchical manner between the Isometrics and flange joints and the user can also edit some information in the same screen. This sub module comes under “Preparation Module” 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page **149 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0149-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0149-06.png)


The user can search for the different search criteria options as mentioned below. 

- PDS Area 

- Line No. 

- ISO No. 

- Priority 

- Type 

- Service Class 

- Subcontractor 

- Area classification 

The search results will be displayed in a hierarchical format starting from the ISO, the user can select to expand and explore a specific ISO, in which the child Flange joints will appear. 

In this screen the user can add more than one Flange joint to the ISO. When the user is adding the Flange joint has to follow some validation rules as follows. 

- In the below screen, all the fields are mandatory, the user have to fill all the details. 

- The value of the “Bolt No.” should have minimum three characters. Example: BT01 

- Bolt No should start with ‘BT’. 

- PSMS will check whether there are duplicate Flange joints (same Bolt no.). If duplicates exist, an error message will appear against the particular Flange joint. 

- Dia inch, Bolt Size and BoltQty accept only numeric values, otherwise system will validate. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**150 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0150-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0150-07.png)


## **19.2.2 Flange Joint Progress Template** 

The flange joint progress can be updated in the easy piping with two methods. 

- Flange joint progress Import Method 

- Flange joint progress input method. 

The flange joint progress template helps the user to import the Flange joint progress. This template is also used to link the test packs to the flange joints for the relevant Isometrics. 

The user can download the template from the import module. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0150-14.png)


O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **151 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0151-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0151-04.png)


The above template consists several parameters as mentioned below. 

- Test Pack 

- Iso No (Read only field) 

- 

- 

- 

- 

- 

- 

- 

- 

- 

   - Rev (Read only field) 

   - Sheet No. (Read only field) 

   - BT No (Read only field) 

   - Diam : (Read only field) 

   - Rating :(Editable) 

   - Bolt size : (Read only field) 

   - Bolt ident  (Read only field) 

   - Bolt qty : (Read only field) 

   - Bolt Length (Read only field) 

- UT: (Read only field)(UT calculation will do at the time of export (Dynamic). Using this formula **: UT = Reference point quantity x coef Diam x Coef Rating x Coef Punch** ) 

   - **Note:** If coef punch is null (That means it is not defined) then the UT value is Null. 

- 

- 

- 

- 

- 

- Jointing method: can be only as per project referential. 

- Jointing value : editable 

- Joint period: can be only as per project definition table: for example  Before Test / Before PMC / After PMC 

- Joint Category: can be only as per project definition table : for example X, Y, Z 

- Reason can be only as per project definition table. 

The following are the joint progress along with their data types: 

- Joint date : date format (dd-MMM-yyyy) 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **152 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0152-02.png)


## **CMC – Construction Method Center** 

- Report Nbr 

- Jointer (Drop down) 

- Tag nbr 

In case a joint has 2 or more progress records, records will be displayed by one or more additional line. 

## **19.2.3 Flange joint progress import method** 

The user can import the progress from the “Import module” The user can update the template with the relevant information and import from this screen 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0152-10.png)


The user can use the Icon and select the file and use the icon to import all the progress information into Easy Piping. Note: 

- The progress data in the excel sheet will always supersede progress data in the database. Meaning that if there was a conflict between the data in the excel sheet and the actual data in PSMS, that particular cell will be highlighted in yellow. The user will have to confirm the changes and proceed the import if he wishes. The data in the system will be overwritten with the new data on confirmation. 

- Import of flange joints which are not defined will be rejected by the system 

- Jointing method column and Jointing value column should have values as per Torquing requirements project referential. 

- Joint period column should have values as per project definition table: for example  Before Test / Before PMC / After PMC 

- Punch column should have values as per project definition table: for example X, Y, Z. 

- Reason column can have alphanumeric values. should have values as per project definition table For example NA, Test blind, vent point, drain point, blowing point. 

- Joint date column should have the following date format (dd-MMM-yyyy). 

- Report Nbr can have alphanumeric values. No validations. 

- Jointer column can have values that are defined in the Jointer referential. 

- Tag nbr can have alphanumeric values. No validations. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **153 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0153-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0153-04.png)


## **19.2.4 Flange joint progress input method** 

The flange joint progress screen comes under the spool erection module. In this screen the user can search for a particular Isometric and the system will display all the flange joints related to the isometric. If the user has defined some parameters like Jointing method, category and reasons for a particular flange joint initially, he can edit the information in this screen. The Flange joint information details to be shown are: 

- Jointing method: can be only as per project referential. 

- Joint period: can be only as per project definition table: for example Before Test / Before PMC / After PMC 

- Joint Category: can be only as per project definition table: for example X, Y, Z 

- Reason can be only as per project definition table. 

- Joint date : date format (dd-MMM-yyyy) 

- Report Nbr 

- Jointer (Drop down) 

- Tag nbr 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM 03 0** 

Page 

**154 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0154-04.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0154-06.png)


If the Flange joint is progressed by only 1 Jointer, then the user can enter the progress details in the same screen. 

If the flange joint is progressed by 2 jointers, the system will display an icon ( ) in each and every row. The user can click on this icon, the system will display a pop up where user can update the progress. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0154-09.png)


## Note: 

When the user opens the erection progress screen, the system will check if the rev number of the corresponding spool is matching with the rev number of flange data related. Otherwise, the system will disable the “flange joint progress” grid and will display a warning message to the user. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. 

**14002V 515 JSM** 

**03 0** 

Page 

**155 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0155-05.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0155-07.png)


## **20. TESTPACK MANGEMENT REPORTS** 

In Easy piping the user can generate the reports for the test pack status. The below Image shows the location of the reports 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0155-10.png)



![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0155-11.png)


9833N_361_Test_Pa 

ck_Weld_History_She This report will provide the weld history of all the spools related to the selected test pack. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

Activity Unit Document Type Serial No. Rev. **14002V 515 JSM 03 0** 

Page **156 / 156** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0156-02.png)


## **CMC – Construction Method Center** 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0156-04.png)


System-wise_Summa ry_Report.xls This report will provide the status of the test packs on a system level for the entire project. The user can select either system or sub system. 


![](docs/marker-output/images/Easy_Piping_User_Manual.pdf-0156-06.png)


Testpack-wise_Summ ary_Report.xls This report will provide the status of each test pack with the construction and testing information. System-wise_Details _Report.xls This report will provide the status of system completion including the construction and test pack status. Testpack-wise_Detail s_Report.xls This report will provide the information of each test pack and punch items also. 

This report will provide the status of each test pack with the construction and testing information. 

O:\14002\Construction_system\Database R&D\EasyPiping\Easy Piping User Manual\TECHNIP DOCUMENT-EASY PIPING User Manual.docx 

