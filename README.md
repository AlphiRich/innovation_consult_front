# innovation_consult_front
LegalOS1_1_UserManual

## Election-COS1.0

`election-cos-app/` holds the Election-COS1.0 build — a multi-tenant,
offline-first PWA for South African political campaign field operations,
built against `IC-ECOS-BUILD-2026-V2`. See
[`election-cos-app/BUILD-STATUS.md`](./election-cos-app/BUILD-STATUS.md) for
what's shipped, what's a placeholder pending real screen assets, and what's
blocked on infra/legal input.
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Innovation ConsultIt - Legal OS</title>
    <style>
        /* === BASE STYLES & BRANDING === */
        :root {
            --navy-blue: #1C355E;
            --gold: #C4A464;
            --burgundy: #8B2332;
            --light-bg: #F4F6F8;
            --text-dark: #333333;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--light-bg);
            color: var(--text-dark);
            margin: 0;
            padding: 50px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Mock Header to show branding */
        .app-header {
            background-color: white;
            width: 100%;
            max-width: 1000px;
            padding: 20px;
            border-bottom: 4px solid var(--burgundy);
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            margin-bottom: 40px;
            text-align: center;
        }
        
        .app-header h1 {
            color: var(--navy-blue);
            margin: 0;
        }

        .app-header p {
            color: var(--gold);
            font-weight: bold;
            font-style: italic;
            margin: 5px 0 0 0;
        }

        /* === BUTTON TO OPEN MODAL === */
        .open-manual-btn {
            background-color: var(--navy-blue);
            color: white;
            border: 2px solid var(--navy-blue);
            padding: 15px 30px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .open-manual-btn:hover {
            background-color: white;
            color: var(--navy-blue);
            border-color: var(--navy-blue);
        }

        /* === MODAL BACKGROUND (OVERLAY) === */
        .modal-overlay {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
        }

        /* === MODAL CONTENT BOX === */
        .modal-content {
            background-color: #ffffff;
            margin: 5% auto;
            padding: 40px;
            border-radius: 8px;
            border-top: 5px solid var(--navy-blue);
            width: 80%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            position: relative;
            text-align: left;
        }

        /* === CLOSE BUTTON === */
        .close-btn {
            color: var(--burgundy);
            position: absolute;
            top: 20px;
            right: 25px;
            font-size: 32px;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .close-btn:hover {
            color: var(--navy-blue);
        }

        /* === MANUAL CONTENT STYLES === */
        .modal-content h2 {
            color: var(--navy-blue);
            text-align: center;
            border-bottom: 2px solid var(--gold);
            padding-bottom: 10px;
            margin-top: 0;
        }

        .modal-content h3 {
            color: var(--burgundy);
            margin-top: 30px;
        }

        .step-box {
            background-color: #f9f9f9;
            border-left: 4px solid var(--gold);
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 0 5px 5px 0;
        }

        .highlight {
            font-weight: bold;
            color: var(--navy-blue);
        }
        
        .infographic-placeholder {
            text-align: center;
            margin: 20px 0;
            padding: 30px;
            background-color: #eef2f5;
            border: 2px dashed var(--navy-blue);
            border-radius: 5px;
            color: var(--navy-blue);
            font-style: italic;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <div class="app-header">
        <h1>Innovation ConsultIt</h1>
        <p>knowledge to action</p>
    </div>

    <button class="open-manual-btn" id="openManualBtn">📖 Open Legal OS User Manual</button>

    <div id="manualModal" class="modal-overlay">
        <div class="modal-content">
            <span class="close-btn" id="closeManualBtn">&times;</span>
            
            <h2>Legal OS User Manual</h2>
            <p>Welcome to your complete South African Legal Practice management tool. Follow these steps to maximize your efficiency.</p>

            <h3>1. The Gatekeeper: Initializing Your Session</h3>
            <div class="step-box">
                <p>Before uploading any documents, you must set the procedural ruleset for the AI.</p>
                <ul>
                    <li><span class="highlight">Step 1:</span> Select your Forum (e.g., Gauteng High Court, Magistrate's Court).</li>
                    <li><span class="highlight">Step 2:</span> Select the Matter Type (Civil or Criminal).</li>
                    <li><span class="highlight">Step 3:</span> Specify the filing method (e.g., CaseLines, CourtOnline, or Physical).</li>
                </ul>
            </div>
            
            <div class="infographic-placeholder">
                [Insert Flowchart Image Here: Gatekeeper logic selecting between Civil and Criminal law]
            </div>

            <h3>2. Document Generation</h3>
            <div class="step-box">
                <p>Use precise prompts to generate court-ready documents.</p>
                <p><strong>Example Prompt:</strong> <em>"Draft a Rule 35(12) notice for the Defendant's bank statements mentioned in the Answering Affidavit."</em></p>
                <p>The app will automatically format the caption, apply the correct High Court terminology, and append a Commissioner of Oaths Jurat for affidavits.</p>
            </div>

            <h3>3. Taxation & Billing</h3>
            <div class="step-box">
                <p>Automate your Bill of Costs using Uniform Rule 70.</p>
                <ul>
                    <li>Upload your fee notes or time logs.</li>
                    <li>Prompt the AI to generate a Bill of Costs on the <span class="highlight">Party and Party</span> or <span class="highlight">Attorney and Client</span> scale.</li>
                    <li>The system will automatically calculate the 15% VAT and append the Taxing Master's Allocator.</li>
                </ul>
            </div>
            
            <div class="infographic-placeholder">
                [Insert Diagram Image Here: Breakdown of a South African Bill of Costs]
            </div>
        </div>
    </div>

    <script>
        const modal = document.getElementById("manualModal");
        const btn = document.getElementById("openManualBtn");
        const span = document.getElementById("closeManualBtn");

        // Open modal
        btn.onclick = function() {
            modal.style.display = "block";
        }

        // Close modal via "X"
        span.onclick = function() {
            modal.style.display = "none";
        }

        // Close modal by clicking outside the box
        window.onclick = function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
    </script>

</body>
</html>
