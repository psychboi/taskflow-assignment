// Individual Task Entity Class
class TaskEntity {
  constructor(title, description = "", priority = "medium", category = "personal", dueDate = null, dueTime = null) {
    this.taskId = this.generateUniqueId()
    this.title = title
    this.description = description
    this.priority = priority
    this.category = category
    this.isCompleted = false
    this.creationTimestamp = new Date()
    this.lastModified = new Date()
    this.dueDate = dueDate
    this.dueTime = dueTime
  }

  generateUniqueId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  modifyTask(updatedData) {
    const allowedFields = ["title", "description", "priority", "category", "dueDate", "dueTime"]
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

  getFormattedCreationDate() {
    return this.creationTimestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  getFormattedDueDate() {
    if (!this.dueDate) return null

    const dueDateTime = this.getDueDateObject()
    if (!dueDateTime) return null

    return dueDateTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(this.dueTime && {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })
  }

  getDueDateObject() {
    if (!this.dueDate) return null

    // Fix timezone issue by creating date in local timezone
    const dateParts = this.dueDate.split("-")
    const year = Number.parseInt(dateParts[0])
    const month = Number.parseInt(dateParts[1]) - 1 // Month is 0-indexed
    const day = Number.parseInt(dateParts[2])

    const dueDateTime = new Date(year, month, day)

    if (this.dueTime) {
      const [hours, minutes] = this.dueTime.split(":")
      dueDateTime.setHours(Number.parseInt(hours), Number.parseInt(minutes), 0, 0)
    } else {
      dueDateTime.setHours(23, 59, 59, 999) // End of day if no time specified
    }

    return dueDateTime
  }

  isOverdue() {
    if (!this.dueDate || this.isCompleted) return false
    const dueDateObj = this.getDueDateObject()
    return dueDateObj && new Date() > dueDateObj
  }

  isDueToday() {
    if (!this.dueDate || this.isCompleted) return false
    const dueDateObj = this.getDueDateObject()
    if (!dueDateObj) return false

    const today = new Date()
    return (
      dueDateObj.getDate() === today.getDate() &&
      dueDateObj.getMonth() === today.getMonth() &&
      dueDateObj.getFullYear() === today.getFullYear()
    )
  }

  isDueSoon() {
    if (!this.dueDate || this.isCompleted) return false
    const dueDateObj = this.getDueDateObject()
    if (!dueDateObj) return false

    const today = new Date()
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
    return dueDateObj > today && dueDateObj <= threeDaysFromNow
  }

  getDueDateStatus() {
    if (!this.dueDate || this.isCompleted) return null
    if (this.isOverdue()) return "overdue"
    if (this.isDueToday()) return "today"
    if (this.isDueSoon()) return "upcoming"
    return "normal"
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
    this.startOverdueChecker()
  }

  createNewTask(taskData, showNotification = true) {
    const newTask = new TaskEntity(
      taskData.title,
      taskData.description,
      taskData.priority,
      taskData.category,
      taskData.dueDate || null,
      taskData.dueTime || null,
    )

    this.taskCollection.push(newTask)
    this.persistToStorage()

    if (showNotification) {
      this.displayAlert(`Task "${newTask.title}" created successfully!`, "success")

      // High priority notification with delay
      if (newTask.priority === "high") {
        setTimeout(() => {
          this.displayAlert(`⚠️ High priority task "${newTask.title}" needs attention!`, "warning")
        }, 1500)
      }

      // Due date notifications
      if (newTask.dueDate) {
        if (newTask.isDueToday()) {
          setTimeout(() => {
            this.displayAlert(`📅 Task "${newTask.title}" is due today!`, "warning")
          }, 2000)
        } else if (newTask.isDueSoon()) {
          setTimeout(() => {
            this.displayAlert(`⏰ Task "${newTask.title}" is due soon!`, "info")
          }, 2000)
        }
      }
    }

    return newTask
  }

  modifyExistingTask(taskId, updatedData) {
    const targetTask = this.findTaskById(taskId)
    if (targetTask) {
      const previousPriority = targetTask.priority
      const previousDueDate = targetTask.dueDate
      targetTask.modifyTask(updatedData)
      this.persistToStorage()
      this.displayAlert(`Task "${targetTask.title}" updated successfully!`, "success")

      // Priority change notification
      if (previousPriority !== "high" && targetTask.priority === "high") {
        setTimeout(() => {
          this.displayAlert(`🔥 Task "${targetTask.title}" is now high priority!`, "warning")
        }, 1500)
      }

      // Due date change notifications
      if (!previousDueDate && targetTask.dueDate) {
        if (targetTask.isDueToday()) {
          setTimeout(() => {
            this.displayAlert(`📅 Task "${targetTask.title}" is due today!`, "warning")
          }, 2000)
        } else if (targetTask.isDueSoon()) {
          setTimeout(() => {
            this.displayAlert(`⏰ Task "${targetTask.title}" is due soon!`, "info")
          }, 2000)
        }
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
      const wasCompleted = targetTask.isCompleted
      targetTask.toggleCompletionStatus()
      this.persistToStorage()

      if (targetTask.isCompleted) {
        // Task completed
        this.displayAlert(`Task "${targetTask.title}" completed!`, "success")

        // High priority completion celebration
        if (targetTask.priority === "high") {
          setTimeout(() => {
            this.displayAlert(`🎉 High priority task "${targetTask.title}" completed! Excellent work!`, "success")
          }, 1500)
        }

        // Overdue task completion
        if (targetTask.isOverdue()) {
          setTimeout(() => {
            this.displayAlert(`✅ Overdue task "${targetTask.title}" finally completed!`, "success")
          }, 1500)
        }
      } else {
        // Task reactivated
        this.displayAlert(`Task "${targetTask.title}" reactivated!`, "info")

        // Show alerts for reactivated tasks
        if (targetTask.priority === "high") {
          setTimeout(() => {
            this.displayAlert(`⚠️ High priority task "${targetTask.title}" is now active again!`, "warning")
          }, 1500)
        }

        if (targetTask.isOverdue()) {
          setTimeout(() => {
            this.displayAlert(`🚨 Task "${targetTask.title}" is overdue!`, "error")
          }, 2000)
        }
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
        if (this.filterCriteria.status === "overdue" && !task.isOverdue()) return false
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
    } else if (this.sortMethod === "dueDate") {
      return tasks.sort((a, b) => {
        // Tasks without due dates go to the end
        if (!a.dueDate && !b.dueDate) return new Date(b.creationTimestamp) - new Date(a.creationTimestamp)
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1

        const dueDateA = a.getDueDateObject()
        const dueDateB = b.getDueDateObject()
        return dueDateA - dueDateB
      })
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
    const overdueTasks = this.taskCollection.filter((task) => task.isOverdue()).length

    return {
      total: totalTasks,
      active: activeTasks,
      completed: completedTasks,
      overdue: overdueTasks,
    }
  }

  startOverdueChecker() {
    // Check for overdue tasks every minute
    setInterval(() => {
      this.checkOverdueTasks()
    }, 60000) // 60 seconds

    // Initial check
    setTimeout(() => {
      this.checkOverdueTasks()
    }, 5000) // Check after 5 seconds on load
  }

  checkOverdueTasks() {
    const overdueTasks = this.taskCollection.filter((task) => task.isOverdue())
    const newlyOverdue = overdueTasks.filter((task) => {
      // Check if this task just became overdue (within the last minute)
      const dueDateObj = task.getDueDateObject()
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 60000)
      return dueDateObj >= oneMinuteAgo && dueDateObj <= now
    })

    newlyOverdue.forEach((task) => {
      this.displayAlert(`🚨 Task "${task.title}" is now overdue!`, "error")
    })
  }

  persistToStorage() {
    localStorage.setItem("taskFlowData", JSON.stringify(this.taskCollection))
  }

  initializeFromStorage() {
    const storedData = localStorage.getItem("taskFlowData")
    if (storedData) {
      const parsedTasks = JSON.parse(storedData)
      this.taskCollection = parsedTasks.map((taskData) => {
        const task = new TaskEntity(
          taskData.title,
          taskData.description,
          taskData.priority,
          taskData.category,
          taskData.dueDate,
          taskData.dueTime,
        )
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
      if (alertElement.parentNode) {
        alertElement.classList.remove("show")
        setTimeout(() => {
          if (alertElement.parentNode) {
            alertContainer.removeChild(alertElement)
          }
        }, 300)
      }
    }, 4000)
  }

  // Method to test notifications manually
  testNotifications() {
    this.displayAlert("This is a test success notification!", "success")
    setTimeout(() => {
      this.displayAlert("This is a test warning notification!", "warning")
    }, 1000)
    setTimeout(() => {
      this.displayAlert("This is a test error notification!", "error")
    }, 2000)
    setTimeout(() => {
      this.displayAlert("This is a test info notification!", "info")
    }, 3000)
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
    this.dueDateField = document.getElementById("taskDueDate")
    this.dueTimeField = document.getElementById("taskDueTime")
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
    this.overdueCountEl = document.getElementById("overdueCount")

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
    document.getElementById("sortByDueDate").addEventListener("click", () => this.handleSorting("dueDate"))

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

    // Add keyboard shortcut for testing notifications (Ctrl+Shift+T)
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "T") {
        e.preventDefault()
        this.taskSystem.testNotifications()
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
      dueDate: formData.get("dueDate") || null,
      dueTime: formData.get("dueTime") || null,
    }

    if (this.taskSystem.currentEditingId) {
      // Update existing task
      this.taskSystem.modifyExistingTask(this.taskSystem.currentEditingId, taskData)
      this.taskSystem.currentEditingId = null
    } else {
      // Create new task
      this.taskSystem.createNewTask(taskData, true) // Always show notifications for user actions
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
    const activeButton = document.getElementById(`sortBy${method.charAt(0).toUpperCase() + method.slice(1)}`)
    if (activeButton) {
      activeButton.classList.add("active")
    }
  }

  updateActiveFilter(filterButtons, activeButton) {
    filterButtons.forEach((btn) => btn.classList.remove("active"))
    activeButton.classList.add("active")
  }

  openTaskForm(taskId = null) {
    // Force clear form BEFORE doing anything else
    this.taskForm.reset()
    this.dueDateField.value = ""
    this.dueTimeField.value = ""
    this.dueDateField.removeAttribute("value")
    this.dueTimeField.removeAttribute("value")

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
      // Create mode - ensure completely clean form
      this.resetForm()
      this.formHeading.textContent = "Create New Task"
      this.submitButton.textContent = "Create Task"
    }

    this.formContainer.classList.add("active")

    // Focus title field after a brief delay to ensure form is ready
    setTimeout(() => {
      this.titleField.focus()
      // Double-check the date fields are empty
      console.log("After opening form - Due date:", this.dueDateField.value)
      console.log("After opening form - Due time:", this.dueTimeField.value)
    }, 150)
  }

  populateFormForEdit(task) {
    this.titleField.value = task.title
    this.descriptionField.value = task.description
    this.priorityField.value = task.priority
    this.categoryField.value = task.category
    this.dueDateField.value = task.dueDate || ""
    this.dueTimeField.value = task.dueTime || ""
  }

  closeTaskForm() {
    this.formContainer.classList.remove("active")
    this.taskSystem.currentEditingId = null

    // Add a small delay to ensure form clears properly
    setTimeout(() => {
      this.resetForm()
    }, 100)
  }

  resetForm() {
    // Force form reset multiple ways
    this.taskForm.reset()

    // Explicitly clear each field with multiple methods
    const fields = [
      { element: this.titleField, defaultValue: "" },
      { element: this.descriptionField, defaultValue: "" },
      { element: this.priorityField, defaultValue: "medium" },
      { element: this.categoryField, defaultValue: "personal" },
      { element: this.dueDateField, defaultValue: "" },
      { element: this.dueTimeField, defaultValue: "" },
    ]

    fields.forEach((field) => {
      field.element.value = field.defaultValue
      field.element.defaultValue = field.defaultValue

      // Force DOM update
      field.element.setAttribute("value", field.defaultValue)

      // Trigger change event to ensure any listeners are notified
      field.element.dispatchEvent(new Event("change", { bubbles: true }))
    })

    // Clear validation messages and styling
    this.titleValidation.textContent = ""
    this.titleField.style.borderColor = "var(--border-color)"

    // Debug logging - remove this after testing
    console.log("Form reset - Due date value:", this.dueDateField.value)
    console.log("Form reset - Due time value:", this.dueTimeField.value)
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
    this.overdueCountEl.textContent = stats.overdue
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
    const overdueClass = task.isOverdue() ? "overdue" : ""
    const priorityClass = task.priority
    const categoryClass = task.category

    // Generate date information
    const createdDate = task.getFormattedCreationDate()
    const dueDate = task.getFormattedDueDate()
    const dueDateStatus = task.getDueDateStatus()

    let dueDateHTML = ""
    if (dueDate) {
      const dueDateClass = dueDateStatus ? `due-date ${dueDateStatus}` : "due-date"
      const dueDateIcon = dueDateStatus === "overdue" ? "🚨" : dueDateStatus === "today" ? "📅" : "⏰"
      dueDateHTML = `<div class="${dueDateClass}">${dueDateIcon} Due: ${dueDate}</div>`
    }

    return `
      <div class="task-card ${completedClass} ${overdueClass}" data-task-id="${task.taskId}">
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
          <div class="task-dates">
            ${dueDateHTML}
            <div class="created-date">Created: ${createdDate}</div>
          </div>
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

  // Add sample data if no tasks exist (without notifications for initial load)
  if (taskManagementSystem.taskCollection.length === 0) {
    // Comment out or remove all the sample task creation code below
    /*
    const today = new Date()
    const todayString = today.toISOString().split("T")[0]

    // Create a task due tomorrow
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split("T")[0]

    // Create an overdue task (yesterday)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayString = yesterday.toISOString().split("T")[0]

    taskManagementSystem.createNewTask(
      {
        title: "Welcome to TaskFlow!",
        description: "This is your first task. You can edit, complete, or delete it to get started.",
        priority: "medium",
        category: "personal",
        dueDate: tomorrowString,
        dueTime: "14:00",
      },
      false,
    )

    taskManagementSystem.createNewTask(
      {
        title: "Review quarterly reports",
        description: "Analyze Q3 performance metrics and prepare summary for stakeholders",
        priority: "high",
        category: "work",
        dueDate: todayString,
        dueTime: "17:00",
      },
      false,
    )

    taskManagementSystem.createNewTask(
      {
        title: "Submit expense report",
        description: "Upload receipts and submit monthly expense report to HR",
        priority: "high",
        category: "work",
        dueDate: yesterdayString,
        dueTime: "12:00",
      },
      false,
    )

    taskManagementSystem.createNewTask(
      {
        title: "Plan weekend activities",
        description: "Research local events and make reservations",
        priority: "low",
        category: "personal",
        dueDate: null,
        dueTime: null,
      },
      false,
    )
    */

    ui.refreshDisplay()
  }

  // Show a welcome notification after everything loads
  setTimeout(() => {
    taskManagementSystem.displayAlert(
      "Welcome to TaskFlow! Your tasks now support due dates and overdue notifications.",
      "info",
    )
  }, 1000)
})
