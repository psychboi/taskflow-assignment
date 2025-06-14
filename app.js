// Individual Task Entity Class
class TaskEntity {
  constructor(title, description = "", priority = "medium", category = "personal") {
    this.taskId = this.generateUniqueId()
    this.title = title
    this.description = description
    this.priority = priority
    this.category = category
    this.isCompleted = false
    this.creationTimestamp = new Date()
    this.lastModified = new Date()
  }

  generateUniqueId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  modifyTask(updatedData) {
    const allowedFields = ["title", "description", "priority", "category"]
    allowedFields.forEach((field) => {
      if (updatedData.hasOwnProperty(field)) {
        this[field] = updatedData[field]
      }
    })
    this.lastModified = new Date()
  }

  toggleCompletionStatus() {
    this.isCompleted = !this.isCompleted
    this.lastModified = new Date()
  }

  searchMatch(searchQuery) {
    const query = searchQuery.toLowerCase().trim()
    return this.title.toLowerCase().includes(query) || this.description.toLowerCase().includes(query)
  }

  getFormattedDate() {
    return this.creationTimestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
}

// Task Management System Class
class TaskManagementSystem {
  constructor() {
    this.taskCollection = []
    this.filterCriteria = {
      category: "all",
      priority: "all",
      status: "all",
      searchTerm: "",
    }
    this.currentEditingId = null
    this.sortMethod = "priority"
    this.initializeFromStorage()
  }

  createNewTask(taskData) {
    const newTask = new TaskEntity(taskData.title, taskData.description, taskData.priority, taskData.category)

    this.taskCollection.push(newTask)
    this.persistToStorage()
    this.displayAlert(`Task "${newTask.title}" created successfully!`, "success")

    // High priority notification
    if (newTask.priority === "high") {
      setTimeout(() => {
        this.displayAlert(`⚠️ High priority task "${newTask.title}" needs attention!`, "warning")
      }, 1500)
    }

    return newTask
  }

  modifyExistingTask(taskId, updatedData) {
    const targetTask = this.findTaskById(taskId)
    if (targetTask) {
      const previousPriority = targetTask.priority
      targetTask.modifyTask(updatedData)
      this.persistToStorage()
      this.displayAlert(`Task "${targetTask.title}" updated successfully!`, "success")

      // Priority change notification
      if (previousPriority !== "high" && targetTask.priority === "high") {
        setTimeout(() => {
          this.displayAlert(`🔥 Task "${targetTask.title}" is now high priority!`, "warning")
        }, 1500)
      }

      return targetTask
    }
    return null
  }

  removeTask(taskId) {
    const taskIndex = this.taskCollection.findIndex((task) => task.taskId === taskId)
    if (taskIndex !== -1) {
      const removedTask = this.taskCollection[taskIndex]
      this.taskCollection.splice(taskIndex, 1)
      this.persistToStorage()
      this.displayAlert(`Task "${removedTask.title}" deleted successfully!`, "success")
      return true
    }
    return false
  }

  toggleTaskCompletion(taskId) {
    const targetTask = this.findTaskById(taskId)
    if (targetTask) {
      targetTask.toggleCompletionStatus()
      this.persistToStorage()

      const statusMessage = targetTask.isCompleted ? "completed" : "reactivated"
      this.displayAlert(`Task "${targetTask.title}" ${statusMessage}!`, "success")

      // High priority completion celebration
      if (targetTask.isCompleted && targetTask.priority === "high") {
        setTimeout(() => {
          this.displayAlert(`🎉 High priority task "${targetTask.title}" completed! Excellent work!`, "success")
        }, 1500)
      }

      return targetTask
    }
    return null
  }

  findTaskById(taskId) {
    return this.taskCollection.find((task) => task.taskId === taskId)
  }

  getFilteredTaskList() {
    const filteredTasks = this.taskCollection.filter((task) => {
      // Category filtering
      if (this.filterCriteria.category !== "all" && task.category !== this.filterCriteria.category) {
        return false
      }

      // Priority filtering
      if (this.filterCriteria.priority !== "all" && task.priority !== this.filterCriteria.priority) {
        return false
      }

      // Status filtering
      if (this.filterCriteria.status !== "all") {
        if (this.filterCriteria.status === "completed" && !task.isCompleted) return false
        if (this.filterCriteria.status === "pending" && task.isCompleted) return false
      }

      // Search filtering
      if (this.filterCriteria.searchTerm && !task.searchMatch(this.filterCriteria.searchTerm)) {
        return false
      }

      return true
    })

    // Apply sorting
    return this.applySorting(filteredTasks)
  }

  applySorting(tasks) {
    if (this.sortMethod === "priority") {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return tasks.sort((a, b) => {
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return new Date(b.creationTimestamp) - new Date(a.creationTimestamp)
      })
    } else if (this.sortMethod === "date") {
      return tasks.sort((a, b) => new Date(b.creationTimestamp) - new Date(a.creationTimestamp))
    }
    return tasks
  }

  updateFilterCriteria(filterType, value) {
    this.filterCriteria[filterType] = value
  }

  setSortMethod(method) {
    this.sortMethod = method
  }

  clearAllCompletedTasks() {
    const completedTasksCount = this.taskCollection.filter((task) => task.isCompleted).length
    this.taskCollection = this.taskCollection.filter((task) => !task.isCompleted)
    this.persistToStorage()

    if (completedTasksCount > 0) {
      this.displayAlert(`${completedTasksCount} completed task(s) cleared!`, "success")
    } else {
      this.displayAlert("No completed tasks to clear!", "info")
    }
  }

  getTaskStatistics() {
    const totalTasks = this.taskCollection.length
    const completedTasks = this.taskCollection.filter((task) => task.isCompleted).length
    const activeTasks = totalTasks - completedTasks
    const highPriorityTasks = this.taskCollection.filter((task) => task.priority === "high" && !task.isCompleted).length

    return {
      total: totalTasks,
      active: activeTasks,
      completed: completedTasks,
      highPriority: highPriorityTasks,
    }
  }

  persistToStorage() {
    localStorage.setItem("taskFlowData", JSON.stringify(this.taskCollection))
  }

  initializeFromStorage() {
    const storedData = localStorage.getItem("taskFlowData")
    if (storedData) {
      const parsedTasks = JSON.parse(storedData)
      this.taskCollection = parsedTasks.map((taskData) => {
        const task = new TaskEntity(taskData.title, taskData.description, taskData.priority, taskData.category)
        task.taskId = taskData.taskId
        task.isCompleted = taskData.isCompleted
        task.creationTimestamp = new Date(taskData.creationTimestamp)
        task.lastModified = new Date(taskData.lastModified)
        return task
      })
    }
  }

  displayAlert(message, type = "info") {
    const alertContainer = document.getElementById("alertContainer")
    const alertElement = document.createElement("div")
    alertElement.className = `alert ${type}`
    alertElement.textContent = message

    alertContainer.appendChild(alertElement)

    // Trigger animation
    setTimeout(() => alertElement.classList.add("show"), 100)

    // Remove alert after 4 seconds
    setTimeout(() => {
      alertElement.classList.remove("show")
      setTimeout(() => alertContainer.removeChild(alertElement), 300)
    }, 4000)
  }
}

// User Interface Controller Class
class UIController {
  constructor(taskSystem) {
    this.taskSystem = taskSystem
    this.initializeDOMElements()
    this.setupEventHandlers()
    this.initializeThemeSystem()
    this.refreshDisplay()
  }

  initializeDOMElements() {
    // Form elements
    this.taskForm = document.getElementById("taskCreationForm")
    this.formContainer = document.getElementById("taskFormContainer")
    this.formHeading = document.getElementById("formHeading")
    this.titleField = document.getElementById("taskTitle")
    this.descriptionField = document.getElementById("taskDescription")
    this.priorityField = document.getElementById("taskPriority")
    this.categoryField = document.getElementById("taskCategory")
    this.submitButton = document.getElementById("submitTaskBtn")
    this.titleValidation = document.getElementById("titleValidation")

    // Control elements
    this.searchField = document.getElementById("searchField")
    this.addTaskButton = document.getElementById("addTaskBtn")
    this.closeFormButton = document.getElementById("closeFormBtn")
    this.cancelFormButton = document.getElementById("cancelFormBtn")
    this.clearCompletedButton = document.getElementById("clearCompletedBtn")
    this.themeToggle = document.getElementById("themeSwitcher")

    // Display elements
    this.tasksGrid = document.getElementById("tasksGrid")
    this.sectionTitle = document.getElementById("sectionTitle")

    // Statistics elements
    this.totalCountEl = document.getElementById("totalCount")
    this.activeCountEl = document.getElementById("activeCount")
    this.doneCountEl = document.getElementById("doneCount")

    // Filter elements
    this.categoryFilters = document.querySelectorAll(".filter-btn")
    this.priorityFilters = document.querySelectorAll(".priority-btn")
    this.statusFilters = document.querySelectorAll(".status-btn")
    this.sortButtons = document.querySelectorAll(".sort-btn")
  }

  setupEventHandlers() {
    // Form handling
    this.taskForm.addEventListener("submit", (e) => this.handleFormSubmission(e))
    this.addTaskButton.addEventListener("click", () => this.openTaskForm())
    this.closeFormButton.addEventListener("click", () => this.closeTaskForm())
    this.cancelFormButton.addEventListener("click", () => this.closeTaskForm())

    // Search functionality
    this.searchField.addEventListener("input", (e) => this.handleSearchInput(e))

    // Filter handling
    this.categoryFilters.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleCategoryFilter(e))
    })
    this.priorityFilters.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handlePriorityFilter(e))
    })
    this.statusFilters.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleStatusFilter(e))
    })

    // Sorting
    document.getElementById("sortByPriority").addEventListener("click", () => this.handleSorting("priority"))
    document.getElementById("sortByDate").addEventListener("click", () => this.handleSorting("date"))

    // Other actions
    this.clearCompletedButton.addEventListener("click", () => this.handleClearCompleted())
    this.themeToggle.addEventListener("click", () => this.toggleTheme())

    // Form validation
    this.titleField.addEventListener("input", () => this.validateTitleField())

    // Close form on backdrop click
    this.formContainer.addEventListener("click", (e) => {
      if (e.target === this.formContainer) {
        this.closeTaskForm()
      }
    })
  }

  handleFormSubmission(event) {
    event.preventDefault()

    if (!this.validateForm()) {
      return
    }

    const formData = new FormData(this.taskForm)
    const taskData = {
      title: formData.get("title").trim(),
      description: formData.get("description").trim(),
      priority: formData.get("priority"),
      category: formData.get("category"),
    }

    if (this.taskSystem.currentEditingId) {
      // Update existing task
      this.taskSystem.modifyExistingTask(this.taskSystem.currentEditingId, taskData)
      this.taskSystem.currentEditingId = null
    } else {
      // Create new task
      this.taskSystem.createNewTask(taskData)
    }

    this.closeTaskForm()
    this.refreshDisplay()
  }

  validateForm() {
    return this.validateTitleField()
  }

  validateTitleField() {
    const title = this.titleField.value.trim()
    const validationEl = this.titleValidation

    if (!title) {
      validationEl.textContent = "Task title is required"
      this.titleField.style.borderColor = "var(--danger-color)"
      return false
    } else if (title.length < 2) {
      validationEl.textContent = "Title must be at least 2 characters long"
      this.titleField.style.borderColor = "var(--danger-color)"
      return false
    } else if (title.length > 100) {
      validationEl.textContent = "Title must be less than 100 characters"
      this.titleField.style.borderColor = "var(--danger-color)"
      return false
    } else {
      validationEl.textContent = ""
      this.titleField.style.borderColor = "var(--border-color)"
      return true
    }
  }

  handleSearchInput(event) {
    this.taskSystem.updateFilterCriteria("searchTerm", event.target.value.trim())
    this.refreshDisplay()
  }

  handleCategoryFilter(event) {
    this.updateActiveFilter(this.categoryFilters, event.target)
    const category = event.target.dataset.category
    this.taskSystem.updateFilterCriteria("category", category)
    this.refreshDisplay()
  }

  handlePriorityFilter(event) {
    this.updateActiveFilter(this.priorityFilters, event.target)
    const priority = event.target.dataset.priority
    this.taskSystem.updateFilterCriteria("priority", priority)
    this.refreshDisplay()
  }

  handleStatusFilter(event) {
    this.updateActiveFilter(this.statusFilters, event.target)
    const status = event.target.dataset.status
    this.taskSystem.updateFilterCriteria("status", status)
    this.refreshDisplay()
  }

  handleSorting(method) {
    this.taskSystem.setSortMethod(method)
    this.refreshDisplay()

    // Update active sort button
    this.sortButtons.forEach((btn) => btn.classList.remove("active"))
    document.getElementById(`sortBy${method.charAt(0).toUpperCase() + method.slice(1)}`).classList.add("active")
  }

  updateActiveFilter(filterButtons, activeButton) {
    filterButtons.forEach((btn) => btn.classList.remove("active"))
    activeButton.classList.add("active")
  }

  openTaskForm(taskId = null) {
    if (taskId) {
      // Edit mode
      const task = this.taskSystem.findTaskById(taskId)
      if (task) {
        this.populateFormForEdit(task)
        this.taskSystem.currentEditingId = taskId
        this.formHeading.textContent = "Edit Task"
        this.submitButton.textContent = "Update Task"
      }
    } else {
      // Create mode
      this.resetForm()
      this.formHeading.textContent = "Create New Task"
      this.submitButton.textContent = "Create Task"
    }

    this.formContainer.classList.add("active")
    this.titleField.focus()
  }

  populateFormForEdit(task) {
    this.titleField.value = task.title
    this.descriptionField.value = task.description
    this.priorityField.value = task.priority
    this.categoryField.value = task.category
  }

  closeTaskForm() {
    this.formContainer.classList.remove("active")
    this.taskSystem.currentEditingId = null
    this.resetForm()
  }

  resetForm() {
    this.taskForm.reset()
    this.titleValidation.textContent = ""
    this.titleField.style.borderColor = "var(--border-color)"
  }

  handleTaskAction(action, taskId) {
    switch (action) {
      case "complete":
        this.taskSystem.toggleTaskCompletion(taskId)
        break
      case "edit":
        this.openTaskForm(taskId)
        break
      case "delete":
        if (confirm("Are you sure you want to delete this task?")) {
          this.taskSystem.removeTask(taskId)
        }
        break
    }
    this.refreshDisplay()
  }

  handleClearCompleted() {
    const completedCount = this.taskSystem.taskCollection.filter((task) => task.isCompleted).length
    if (completedCount === 0) {
      this.taskSystem.displayAlert("No completed tasks to clear!", "info")
      return
    }

    if (confirm(`Clear ${completedCount} completed task(s)?`)) {
      this.taskSystem.clearAllCompletedTasks()
      this.refreshDisplay()
    }
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.documentElement.setAttribute("data-theme", newTheme)
    localStorage.setItem("taskFlowTheme", newTheme)

    // Update theme icon
    const themeIcon = this.themeToggle.querySelector(".theme-icon")
    themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙"
  }

  initializeThemeSystem() {
    const savedTheme = localStorage.getItem("taskFlowTheme") || "light"
    document.documentElement.setAttribute("data-theme", savedTheme)

    const themeIcon = this.themeToggle.querySelector(".theme-icon")
    themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙"
  }

  updateStatisticsDisplay() {
    const stats = this.taskSystem.getTaskStatistics()
    this.totalCountEl.textContent = stats.total
    this.activeCountEl.textContent = stats.active
    this.doneCountEl.textContent = stats.completed
  }

  updateSectionTitle() {
    const currentFilter = this.taskSystem.filterCriteria
    let title = "All Tasks"

    if (currentFilter.category !== "all") {
      title = `${currentFilter.category.charAt(0).toUpperCase() + currentFilter.category.slice(1)} Tasks`
    }

    if (currentFilter.searchTerm) {
      title = `Search Results`
    }

    this.sectionTitle.textContent = title
  }

  renderTasksGrid() {
    const filteredTasks = this.taskSystem.getFilteredTaskList()

    if (filteredTasks.length === 0) {
      this.tasksGrid.innerHTML = `
        <div class="empty-message">
          <div class="empty-icon">📝</div>
          <h3>No tasks found</h3>
          <p>${
            this.taskSystem.taskCollection.length === 0
              ? "Create your first task to get started!"
              : "Try adjusting your filters or search terms."
          }</p>
        </div>
      `
      return
    }

    this.tasksGrid.innerHTML = filteredTasks.map((task) => this.generateTaskCardHTML(task)).join("")
    this.attachTaskEventListeners()
  }

  generateTaskCardHTML(task) {
    const completedClass = task.isCompleted ? "completed" : ""
    const priorityClass = task.priority
    const categoryClass = task.category

    return `
      <div class="task-card ${completedClass}" data-task-id="${task.taskId}">
        <div class="priority-indicator ${priorityClass}"></div>
        <div class="task-header">
          <h3 class="task-title">${this.escapeHTML(task.title)}</h3>
          <div class="task-menu">
            <button class="menu-btn" onclick="ui.handleTaskAction('edit', '${task.taskId}')" title="Edit task">
              ✏️
            </button>
          </div>
        </div>
        ${task.description ? `<p class="task-description">${this.escapeHTML(task.description)}</p>` : ""}
        <div class="task-meta">
          <div class="task-badges">
            <span class="priority-badge ${priorityClass}">${task.priority}</span>
            <span class="category-badge ${categoryClass}">${task.category}</span>
          </div>
          <span class="task-date">${task.getFormattedDate()}</span>
        </div>
        <div class="task-actions">
          <button class="action-btn complete-btn" onclick="ui.handleTaskAction('complete', '${task.taskId}')" 
                  title="${task.isCompleted ? "Mark as pending" : "Mark as completed"}">
            ${task.isCompleted ? "↶ Undo" : "✓ Done"}
          </button>
          <button class="action-btn edit-btn" onclick="ui.handleTaskAction('edit', '${task.taskId}')" title="Edit task">
            ✏️ Edit
          </button>
          <button class="action-btn delete-btn" onclick="ui.handleTaskAction('delete', '${task.taskId}')" title="Delete task">
            🗑️ Delete
          </button>
        </div>
      </div>
    `
  }

  attachTaskEventListeners() {
    // Event listeners are handled via onclick attributes for simplicity
    // In a production app, you might prefer event delegation
  }

  escapeHTML(text) {
    const div = document.createElement("div")
    div.textContent = text
    return div.innerHTML
  }

  refreshDisplay() {
    this.updateStatisticsDisplay()
    this.updateSectionTitle()
    this.renderTasksGrid()
  }
}

// Application Initialization
document.addEventListener("DOMContentLoaded", () => {
  const taskManagementSystem = new TaskManagementSystem()
  const ui = new UIController(taskManagementSystem)

  // Make UI controller globally accessible for onclick handlers
  window.ui = ui

  // Add sample data if no tasks exist
  if (taskManagementSystem.taskCollection.length === 0) {
    taskManagementSystem.createNewTask({
      title: "Welcome to TaskFlow!",
      description: "This is your first task. You can edit, complete, or delete it to get started.",
      priority: "medium",
      category: "personal",
    })

    taskManagementSystem.createNewTask({
      title: "Review quarterly reports",
      description: "Analyze Q3 performance metrics and prepare summary for stakeholders",
      priority: "high",
      category: "work",
    })

    taskManagementSystem.createNewTask({
      title: "Plan weekend activities",
      description: "Research local events and make reservations",
      priority: "low",
      category: "personal",
    })

    ui.refreshDisplay()
  }
})
