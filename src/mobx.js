import { makeAutoObservable, runInAction } from "mobx";
import { auth, db } from "./firebase";
import {
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  getAuth,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  deleteDoc,
  query,
  onSnapshot,
  updateDoc,
  getDocs,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import Logger from "@/utils/logger";
import { generateUserAvatar } from "@/utils/avatarGenerator";
import { normalizeAuthUser, normalizeUsername } from "@/lib/auth-profile";
import { requestWelcomeEmail } from "@/lib/welcome-email";

const logger = new Logger({ debugEnabled: false }); // switch to true to see console logs from firebase

async function sendWelcomeEmail(user, username) {
  try {
    await requestWelcomeEmail(user, username);
  } catch (error) {
    // Account creation must still succeed when the email provider is unavailable.
    console.error("Could not send welcome email:", error);
  }
}

class Store {
  // App Data

  todos = [];
  user = null;

  // Static Data
  // Wordpress
  blogs = [];
  blogDetails = new Map();
  blogsLoading = false;
  blogDetailsLoading = new Map();
  blogsFetched = false;

  // Projects
  projects = [];
  projectDetails = new Map();
  cachedProjects = new Map();
  projectsLoading = false;
  projectDetailsLoading = new Map();
  projectFilters = {
    search: "",
    category: "all",
    type: "all",
    visibility: "all",
    status: "all",
    sortBy: "created_desc",
  };
  projectPagination = {
    page: 1,
    limit: 20,
    hasMore: true,
  };

  // Applications
  applications = [];
  applicationsLoading = false;
  applicationsFetched = false;

  lists = [];
  // App States
  isMobileOpen = false;
  loading = true;

  permissions = null;
  permissionsLoading = false;
  permissionsError = null;
  lastPermissionCheck = null;
  permissionCheckInProgress = null;
  authStateVersion = 0;

  isReady = false;

  constructor() {
    makeAutoObservable(this);

    this.initializeAuth();

    this.setIsMobileOpen = this.setIsMobileOpen.bind(this);

    this.upgradeAccount = this.upgradeAccount.bind(this);
    this.loginWithEmail = this.loginWithEmail.bind(this);
    this.signupWithEmail = this.signupWithEmail.bind(this);
    this.signInWithGoogle = this.signInWithGoogle.bind(this);
    this.logout = this.logout.bind(this);

    this.updateUser = this.updateUser.bind(this);

    // Add permission check to auth state change
    this.initializeAuth = this.initializeAuth.bind(this);
    this.checkPermissions = this.checkPermissions.bind(this);
  }

  initializeAuth() {
    const firebaseAuth = getAuth();
    onAuthStateChanged(firebaseAuth, async (authUser) => {
      const authStateVersion = ++this.authStateVersion;
      let userProfile = null;

      try {
        if (authUser) {
          userProfile = await this.loadUserProfile(authUser);
        }
      } catch (error) {
        console.error("Error in initializeAuth:", error);
        userProfile = normalizeAuthUser(authUser);
      }

      if (authStateVersion !== this.authStateVersion) return;

      runInAction(() => {
        this.user = userProfile;
        this.loading = false;
        this.isReady = true;

        if (!userProfile) {
          this.permissions = null;
          this.lastPermissionCheck = null;
        }
      });

      if (userProfile) {
        this.checkPermissions(true);
      }
    });
  }

  async loadUserProfile(authUser) {
    const userDoc = await getDoc(doc(db, "users", authUser.uid));
    return normalizeAuthUser(
      authUser,
      userDoc.exists() ? userDoc.data() : null
    );
  }

  async checkPermissions(force = false) {
    if (!this.user) {
      return;
    }

    if (this.permissionCheckInProgress) {
      return this.permissionCheckInProgress;
    }

    if (
      !force &&
      this.permissions &&
      this.lastPermissionCheck &&
      Date.now() - this.lastPermissionCheck < 5 * 60 * 1000
    ) {
      return this.permissions;
    }

    try {
      this.permissionCheckInProgress = (async () => {
        runInAction(() => {
          this.permissionsLoading = true;
        });

        const idToken = await auth.currentUser.getIdToken();
        const response = await fetch("/api/auth/verify", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (!response.ok) throw new Error("Failed to verify permissions");

        const data = await response.json();

        runInAction(() => {
          this.permissions = data;
          this.permissionsLoading = false;
          this.lastPermissionCheck = Date.now();
          if (
            data.user &&
            this.user &&
            auth.currentUser?.uid === this.user.uid
          ) {
            this.user = normalizeAuthUser(auth.currentUser, {
              ...this.user,
              ...data.user,
            });
          }
        });

        return data;
      })();

      const result = await this.permissionCheckInProgress;
      this.permissionCheckInProgress = null;
      return result;
    } catch (error) {
      console.error("MobX - Permission check error:", error);
      runInAction(() => {
        this.permissionsLoading = false;
        this.permissions = null;
        this.permissionCheckInProgress = null;
      });
    }
  }

  // Add computed properties for easy permission checks
  get isAdmin() {
    return this.permissions?.permissions?.isAdmin ?? false;
  }

  get isMember() {
    return this.permissions?.permissions?.isMember ?? false;
  }

  get hasActiveSubscription() {
    return this.isMember || this.user?.activeMember === true;
  }

  async checkAuth() {
    if (!auth.currentUser) return;

    try {
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      runInAction(() => {
        if (userDoc.exists()) {
          this.user = { uid: auth.currentUser.uid, ...userDoc.data() };
        }
      });

      await this.checkPermissions(true);
    } catch (error) {
      console.error("MobX - checkAuth error:", error);
    }
  }

  get canAccessPackages() {
    return this.permissions?.permissions?.canAccessPackages ?? false;
  }

  get unlockedPackages() {
    // First try to get from permissions if available
    const fromPermissions = this.permissions?.unlockedPackages;
    if (Array.isArray(fromPermissions) && fromPermissions.length > 0) {
      return fromPermissions;
    }

    // Fall back to user object if permissions don't have it
    return this.user?.unlockedPackages ?? [];
  }

  get userStatus() {
    return this.permissions?.status ?? "anonymous";
  }

  // GLOBAL MOBX STATE
  setIsMobileOpen(isMobileOpen) {
    runInAction(() => {
      this.isMobileOpen = isMobileOpen;
    });
  }

  async updateUser(newData) {
    try {
      const userDocRef = doc(db, "users", this.user.uid);
      await updateDoc(userDocRef, newData);
      runInAction(() => {
        this.user = { ...this.user, ...newData };
      });
    } catch (error) {
      console.error("Error updating user:", error);
    }
  }

  // WORDPRESS FUNCTIONS
  async fetchBlogs() {
    if (this.blogsLoading || this.blogsFetched) return;
    this.blogsLoading = true;
    try {
      const response = await fetch("/api/wordpress");
      if (!response.ok) throw new Error("Failed to fetch blogs");
      const data = await response.json();
      runInAction(() => {
        this.blogs = data;
        this.blogsFetched = true;
        this.blogsLoading = false;
      });
    } catch (error) {
      console.error("Error fetching blogs:", error);
      runInAction(() => {
        this.blogsLoading = false;
      });
    }
  }

  async fetchBlogDetails(slug) {
    if (this.blogDetails.has(slug)) return this.blogDetails.get(slug);
    if (this.blogDetailsLoading.get(slug)) return;

    runInAction(() => {
      this.blogDetailsLoading.set(slug, true);
    });

    try {
      const response = await fetch(`/api/wordpress?slug=${slug}`);
      if (!response.ok) throw new Error("Failed to fetch blog details");
      const data = await response.json();
      runInAction(() => {
        this.blogDetails.set(slug, data);
        this.blogDetailsLoading.set(slug, false);
      });
      return data;
    } catch (error) {
      console.error("Error fetching blog details:", error);
      runInAction(() => {
        this.blogDetailsLoading.set(slug, false);
      });
    }
  }

  // Getter for checking if a specific blog's details are loading
  isBlogDetailsLoading(slug) {
    return this.blogDetailsLoading.get(slug) || false;
  }

  // Projects Methods
  async fetchProjects(filters = {}, reset = false) {
    if (this.projectsLoading) return;

    runInAction(() => {
      this.projectsLoading = true;
      if (reset) {
        this.projects = [];
        this.projectPagination.page = 1;
        this.projectPagination.hasMore = true;
      }
    });

    try {
      const params = new URLSearchParams({
        page: this.projectPagination.page.toString(),
        limit: this.projectPagination.limit.toString(),
        ...this.projectFilters,
        ...filters,
      });

      // Prepare headers with authentication if user is logged in
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth header if user is authenticated
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/projects?${params}`, {
        headers,
      });
      if (!response.ok) throw new Error("Failed to fetch projects");

      const data = await response.json();

      runInAction(() => {
        if (reset) {
          this.projects = data.projects;
        } else {
          this.projects = [...this.projects, ...data.projects];
        }

        // Cache the projects
        data.projects.forEach((project) => {
          this.cachedProjects.set(project.id, project);
        });

        this.projectPagination.hasMore = data.hasMore;
        if (data.hasMore) {
          this.projectPagination.page += 1;
        }
      });
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      runInAction(() => {
        this.projectsLoading = false;
      });
    }
  }

  async fetchProjectDetails(id) {
    // Check cache first, but only use it if it has detailed user information
    if (this.cachedProjects.has(id)) {
      const cachedProject = this.cachedProjects.get(id);
      // Only use cached data if it has the detailed user information
      if (
        cachedProject.ownerDetails ||
        cachedProject.adminDetails ||
        cachedProject.teamMemberDetails
      ) {
        runInAction(() => {
          this.projectDetails.set(id, cachedProject);
        });
        return cachedProject;
      }
      // If cached data doesn't have user details, remove it and fetch fresh
      this.cachedProjects.delete(id);
    }

    // If already loading, wait for the existing request
    if (this.projectDetailsLoading.get(id)) {
      // Wait for the loading to complete and then return the cached result
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.projectDetailsLoading.get(id)) {
            clearInterval(checkInterval);
            const project = this.cachedProjects.get(id);
            resolve(project || null);
          }
        }, 50); // Check every 50ms
      });
    }

    runInAction(() => {
      this.projectDetailsLoading.set(id, true);
    });

    try {
      // Prepare headers with authentication if user is logged in
      const headers = {
        "Content-Type": "application/json",
      };

      // Add auth header if user is authenticated
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/projects/${id}`, {
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch project details: ${response.status} ${errorText}`
        );
      }

      const project = await response.json();

      runInAction(() => {
        this.projectDetails.set(id, project);
        this.cachedProjects.set(id, project);
      });

      return project;
    } catch (error) {
      console.error("Error fetching project details:", error);
      return null;
    } finally {
      runInAction(() => {
        this.projectDetailsLoading.set(id, false);
      });
    }
  }

  updateProjectFilters(newFilters) {
    runInAction(() => {
      this.projectFilters = { ...this.projectFilters, ...newFilters };
    });
  }

  isProjectDetailsLoading(id) {
    return this.projectDetailsLoading.get(id) || false;
  }

  // Applications Methods
  async fetchApplications() {
    if (this.applicationsLoading || !this.user) return;

    runInAction(() => {
      this.applicationsLoading = true;
    });

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch("/api/applications", {
        headers,
      });

      if (!response.ok) throw new Error("Failed to fetch applications");

      const data = await response.json();

      runInAction(() => {
        this.applications = data.applications;
        this.applicationsFetched = true;
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      runInAction(() => {
        this.applicationsLoading = false;
      });
    }
  }

  async updateApplicationStatus(applicationId, status) {
    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update application");
      }

      const updatedApplication = await response.json();

      runInAction(() => {
        const index = this.applications.findIndex(
          (app) => app.id === applicationId
        );
        if (index !== -1) {
          this.applications[index] = updatedApplication;
        }
      });

      return updatedApplication;
    } catch (error) {
      console.error("Error updating application:", error);
      throw error;
    }
  }

  //
  //
  //
  //
  //
  // AUTH FUNCTIONS
  async upgradeAccount(email, password, username) {
    try {
      const normalizedUsername = normalizeUsername(
        username,
        email?.split("@")[0] || "New User"
      );
      const credential = EmailAuthProvider.credential(email, password);
      const userCredential = await linkWithCredential(
        auth.currentUser,
        credential
      );

      // Generate unique avatar for the upgraded account
      const generatedAvatar = generateUserAvatar(normalizedUsername);

      const userDocRef = doc(db, "users", userCredential.user.uid);
      await setDoc(
        userDocRef,
        {
          username: normalizedUsername,
          email,
          avatar: generatedAvatar,
          provider: "password",
        },
        { merge: true }
      );

      void sendWelcomeEmail(userCredential.user, normalizedUsername);

      runInAction(() => {
        this.authStateVersion += 1;
        this.user = {
          ...this.user,
          username: normalizedUsername,
          email,
          avatar: generatedAvatar,
          provider: "password",
        };
      });
      this.checkPermissions(true);
    } catch (error) {
      console.error("Error upgrading account:", error);
      throw error;
    }
  }

  signInAnonymously = async () => {
    const userCredential = await firebaseSignInAnonymously(auth);
    const userProfile = normalizeAuthUser(userCredential.user);
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, userProfile);
    }

    runInAction(() => {
      this.authStateVersion += 1;
      this.user = userDoc.exists()
        ? normalizeAuthUser(userCredential.user, userDoc.data())
        : userProfile;
    });
    logger.debug("Signed in anonymously");
  };

  async loginWithEmail({ email, password }) {
    try {
      this.loading = true;
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const userProfile = await this.loadUserProfile(userCredential.user);
      runInAction(() => {
        this.authStateVersion += 1;
        this.user = userProfile;
        this.loading = false;
      });
      this.checkPermissions(true);
    } catch (error) {
      console.error("Error logging in:", error);
      runInAction(() => {
        this.loading = false;
      });
      throw error;
    }
  }

  async signupWithEmail(email, password, username) {
    try {
      this.loading = true;
      const normalizedUsername = normalizeUsername(
        username,
        email?.split("@")[0] || "New User"
      );
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Generate unique avatar for the user
      const generatedAvatar = generateUserAvatar(normalizedUsername);

      // Additional user properties
      const newUserProfile = {
        joined: new Date(),
        createdAt: new Date(),
        username: normalizedUsername,
        email: email,
        uid: userCredential.user.uid,
        avatar: generatedAvatar,
        provider: "password",
      };

      // Create a user profile in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), newUserProfile);

      void sendWelcomeEmail(userCredential.user, normalizedUsername);

      runInAction(() => {
        this.authStateVersion += 1;
        this.user = newUserProfile;
        this.loading = false;
      });
      this.checkPermissions(true);
    } catch (error) {
      console.error("Error signing up:", error);
      runInAction(() => {
        this.loading = false;
      });
      throw error;
    }
  }

  async logout() {
    try {
      await signOut(auth); // Sign out from Firebase Authentication
      runInAction(() => {
        this.authStateVersion += 1;
        this.user = null;
        this.permissions = null;
        this.lastPermissionCheck = null;
      });
    } catch (error) {
      console.error("Error during logout:", error);
      // Handle any errors that occur during logout
    }
  }

  async signInWithGoogle() {
    try {
      console.log("Starting Google sign-in process");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful, user:", result.user);
      const user = result.user;

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log("User document exists:", userDoc.exists());

      let userData;

      if (!userDoc.exists()) {
        console.log("Creating new user profile");

        const normalizedUsername = normalizeUsername(
          user.displayName,
          user.email?.split("@")[0] || "New User"
        );

        // For Google users, use their Google profile picture if available, otherwise generate one
        const avatarUrl =
          user.photoURL || generateUserAvatar(normalizedUsername);

        userData = {
          ...normalizeAuthUser(user),
          createdAt: new Date(),
          username: normalizedUsername,
          email: user.email,
          uid: user.uid,
          avatar: avatarUrl,
        };

        await setDoc(userDocRef, userData);
        console.log("New user profile created:", userData);

        void sendWelcomeEmail(user, normalizedUsername);
      } else {
        console.log("Existing user found:", userDoc.data());
        userData = normalizeAuthUser(user, userDoc.data());
      }

      // Set the user data using runInAction with a direct reference to the store
      console.log("Setting user in MobX store:", userData);
      runInAction(() => {
        this.authStateVersion += 1;
        this.user = userData;
      });
      this.checkPermissions(true);

      console.log("Google sign-in process completed successfully");
    } catch (error) {
      console.error("Error with Google sign-in:", error);
      throw error;
    }
  }

  async sendPasswordReset(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      // Handle success, such as showing a message to the user
    } catch (error) {
      console.error("Error sending password reset email:", error);
      // Handle errors, such as invalid email, etc.
    }
  }

  get isUserAnonymous() {
    return this.user && this.user.provider == "anonymous";
  }
}

const MobxStore = new Store();
export default MobxStore;
