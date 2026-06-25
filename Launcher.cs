using System;
using System.Drawing;
using System.Windows.Forms;
using System.Diagnostics;
using System.IO;

namespace NeoBandersnatch
{
    public class LauncherForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private GroupBox grpStatus;
        private Label lblBackendStatus;
        private Label lblFrontendStatus;
        private Button btnStart;
        private Button btnStop;
        private Button btnOpenBrowser;
        private Button btnExit;
        private Timer statusTimer;

        private Process backendProcess = null;
        private Process frontendProcess = null;

        private string backendPath = "";
        private string frontendPath = "";

        public LauncherForm()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            backendPath = Path.Combine(baseDir, "backend");
            frontendPath = Path.Combine(baseDir, "frontend");

            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "Neo-Bandersnatch OS - Launcher";
            this.Size = new Size(500, 410);
            this.BackColor = Color.FromArgb(10, 15, 10);
            this.ForeColor = Color.FromArgb(57, 255, 20); // Neon Green
            this.Font = new Font("Consolas", 10F, FontStyle.Regular);
            this.FormBorderStyle = FormBorderStyle.FixedSingle;
            this.MaximizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;

            // Title
            lblTitle = new Label();
            lblTitle.Text = "NEO-BANDERSNATCH OS";
            lblTitle.Font = new Font("Consolas", 18F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(57, 255, 20);
            lblTitle.Size = new Size(480, 35);
            lblTitle.Location = new Point(10, 20);
            lblTitle.TextAlign = ContentAlignment.MiddleCenter;
            this.Controls.Add(lblTitle);

            // Subtitle
            lblSubtitle = new Label();
            lblSubtitle.Text = "MAINFRAME INTERFACE CONTROL";
            lblSubtitle.Font = new Font("Consolas", 10F, FontStyle.Bold);
            lblSubtitle.ForeColor = Color.FromArgb(0, 180, 0);
            lblSubtitle.Size = new Size(480, 20);
            lblSubtitle.Location = new Point(10, 55);
            lblSubtitle.TextAlign = ContentAlignment.MiddleCenter;
            this.Controls.Add(lblSubtitle);

            // Status Group
            grpStatus = new GroupBox();
            grpStatus.Text = " ESTADO DEL SISTEMA ";
            grpStatus.ForeColor = Color.FromArgb(57, 255, 20);
            grpStatus.Size = new Size(440, 110);
            grpStatus.Location = new Point(25, 90);
            
            lblBackendStatus = new Label();
            lblBackendStatus.Text = "Servidor Backend : OFFLINE";
            lblBackendStatus.ForeColor = Color.Red;
            lblBackendStatus.Location = new Point(20, 35);
            lblBackendStatus.Size = new Size(400, 25);
            grpStatus.Controls.Add(lblBackendStatus);

            lblFrontendStatus = new Label();
            lblFrontendStatus.Text = "Servidor Frontend: OFFLINE";
            lblFrontendStatus.ForeColor = Color.Red;
            lblFrontendStatus.Location = new Point(20, 65);
            lblFrontendStatus.Size = new Size(400, 25);
            grpStatus.Controls.Add(lblFrontendStatus);

            this.Controls.Add(grpStatus);

            // Buttons
            btnStart = CreateStyledButton("INICIAR SERVIDORES", new Point(25, 220), Color.FromArgb(57, 255, 20));
            btnStart.Click += BtnStart_Click;
            this.Controls.Add(btnStart);

            btnStop = CreateStyledButton("DETENER SERVIDORES", new Point(245, 220), Color.Red);
            btnStop.Click += BtnStop_Click;
            btnStop.Enabled = false;
            this.Controls.Add(btnStop);

            btnOpenBrowser = CreateStyledButton("ABRIR JUEGO EN NAVEGADOR", new Point(25, 275), Color.Cyan);
            btnOpenBrowser.Click += BtnOpenBrowser_Click;
            btnOpenBrowser.Width = 440;
            this.Controls.Add(btnOpenBrowser);

            btnExit = CreateStyledButton("SALIR DEL LAUNCHER", new Point(25, 320), Color.Gray);
            btnExit.Click += BtnExit_Click;
            btnExit.Width = 440;
            this.Controls.Add(btnExit);

            // Timer
            statusTimer = new Timer();
            statusTimer.Interval = 1500;
            statusTimer.Tick += StatusTimer_Tick;
            statusTimer.Start();

            this.FormClosing += LauncherForm_FormClosing;
        }

        private Button CreateStyledButton(string text, Point location, Color color)
        {
            Button btn = new Button();
            btn.Text = text;
            btn.Location = location;
            btn.Size = new Size(215, 38);
            btn.BackColor = Color.Black;
            btn.ForeColor = color;
            btn.FlatStyle = FlatStyle.Flat;
            btn.FlatAppearance.BorderColor = color;
            btn.FlatAppearance.BorderSize = 1;
            btn.Cursor = Cursors.Hand;
            return btn;
        }

        private void BtnStart_Click(object sender, EventArgs e)
        {
            try
            {
                // Start Backend
                if (backendProcess == null || backendProcess.HasExited)
                {
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c npm run dev");
                    psi.WorkingDirectory = backendPath;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    backendProcess = Process.Start(psi);
                }

                // Start Frontend
                if (frontendProcess == null || frontendProcess.HasExited)
                {
                    ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c npm run dev");
                    psi.WorkingDirectory = frontendPath;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    frontendProcess = Process.Start(psi);
                }

                btnStart.Enabled = false;
                btnStop.Enabled = true;

                // Wait 3 seconds and open browser
                Timer delayTimer = new Timer();
                delayTimer.Interval = 3000;
                delayTimer.Tick += (s, args) => {
                    OpenBrowser();
                    delayTimer.Stop();
                    delayTimer.Dispose();
                };
                delayTimer.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al iniciar los servidores: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnStop_Click(object sender, EventArgs e)
        {
            StopProcesses();
            btnStart.Enabled = true;
            btnStop.Enabled = false;
        }

        private void BtnOpenBrowser_Click(object sender, EventArgs e)
        {
            OpenBrowser();
        }

        private void OpenBrowser()
        {
            try
            {
                Process.Start(new ProcessStartInfo("http://localhost:3000") { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error al abrir el navegador: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void BtnExit_Click(object sender, EventArgs e)
        {
            this.Close();
        }

        private void StatusTimer_Tick(object sender, EventArgs e)
        {
            // Check Backend
            if (backendProcess != null && !backendProcess.HasExited)
            {
                lblBackendStatus.Text = "Servidor Backend : ONLINE (Puerto 5002)";
                lblBackendStatus.ForeColor = Color.FromArgb(57, 255, 20);
            }
            else
            {
                lblBackendStatus.Text = "Servidor Backend : OFFLINE";
                lblBackendStatus.ForeColor = Color.Red;
            }

            // Check Frontend
            if (frontendProcess != null && !frontendProcess.HasExited)
            {
                lblFrontendStatus.Text = "Servidor Frontend: ONLINE (Puerto 3000)";
                lblFrontendStatus.ForeColor = Color.FromArgb(57, 255, 20);
            }
            else
            {
                lblFrontendStatus.Text = "Servidor Frontend: OFFLINE";
                lblFrontendStatus.ForeColor = Color.Red;
            }

            // Sync button state if exited unexpectedly
            if ((backendProcess == null || backendProcess.HasExited) && 
                (frontendProcess == null || frontendProcess.HasExited))
            {
                btnStart.Enabled = true;
                btnStop.Enabled = false;
            }
            else
            {
                btnStart.Enabled = false;
                btnStop.Enabled = true;
            }
        }

        private void StopProcesses()
        {
            // Kill entire process tree for Backend
            if (backendProcess != null)
            {
                try
                {
                    KillProcessAndChildren(backendProcess.Id);
                    backendProcess = null;
                }
                catch { }
            }

            // Kill entire process tree for Frontend
            if (frontendProcess != null)
            {
                try
                {
                    KillProcessAndChildren(frontendProcess.Id);
                    frontendProcess = null;
                }
                catch { }
            }
        }

        private void KillProcessAndChildren(int pid)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("taskkill", "/F /T /PID " + pid);
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                Process p = Process.Start(psi);
                if (p != null)
                {
                    p.WaitForExit();
                }
            }
            catch { }
        }

        private void LauncherForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            StopProcesses();
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new LauncherForm());
        }
    }
}