import org.springframework.data.domain.Pageable
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.validation.BindingResult
import org.springframework.web.bind.annotation.*
import org.springframework.web.servlet.ModelAndView
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class OwnerController(private val owners: OwnerRepository) {

    companion object {
        const val VIEWS_OWNER_CREATE_OR_UPDATE_FORM = "owners/createOrUpdateOwnerForm"
    }

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id")
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable(name = "ownerId", required = false) ownerId: Int?): Owner {
        return if (ownerId == null) {
            Owner()
        } else {
            owners.findById(ownerId)
                .orElseThrow { IllegalArgumentException("Owner not found with id: ${ownerId}. Please ensure the ID is correct and the owner exists in the database.") }
        }
    }

    @GetMapping("/owners/new")
    fun initCreationForm(): String {
        return VIEWS_OWNER_CREATE_ORUPDATE_FORM
    }

    @PostMapping("/owners/new")
    fun processCreationForm(@Valid @ModelAttribute("owner") owner: Owner, result: BindingResult, redirectAttributes: RedirectAttributes): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in creating the owner.")
            return VIEWS_OWNER_CREATE_ORUPDATE_FORM
        }

        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Owner Created")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/find")
    fun initFindForm(): String {
        return "owners/findOwners"
    }

    @GetMapping("/owners")
    fun processFindForm(@RequestParam(defaultValue = "1") page: Int, @ModelAttribute("owner") owner: Owner, result: BindingResult, model: Model): String {
        if (owner.lastName.isNullOrEmpty()) {
            owner.lastName = ""
        }

        val paginatedResults = findPaginatedForOwnersLastName(page - 1, 5, owner.lastName)
        if (paginatedResults.isEmpty()) {
            result.rejectValue("lastName", "notFound", "not found")
            return "owners/findOwners"
        }

        if (paginatedResults.totalElements == 1L) {
            val singleOwner = paginatedResults.iterator().next()
            return "redirect:/owners/${singleOwner.id}"
        }

        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginatedResults.totalPages)
        model.addAttribute("totalItems", paginatedResults.totalElements)
        model.addAttribute("listOwners", paginatedResults.content)

        return VIEWS_OWNER_CREATE_ORUPDATE_FORM
    }

    private fun addPaginationModel(page: Int, model: Model, paginated: Page<Owner>): String {
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listOwners", paginated.content)
        return VIEWS_OWNER_CREATE_ORUPDATE_FORM
    }

    private fun findPaginatedForOwnersLastName(page: Int, size: Int, lastname: String): Page<Owner> {
        val pageable = PageRequest.of(page, size)
        return owners.findByLastNameStartingWith(lastname, pageable)
    }

    @GetMapping("/owners/{ownerId}/edit")
    fun initUpdateOwnerForm(): String {
        return VIEWS_OWNER_CREATE_ORUPDATE_FORM
    }

    @PostMapping("/owners/{ownerId}/edit")
    fun processUpdateOwnerForm(@Valid @ModelAttribute("owner") owner: Owner, result: BindingResult, redirectAttributes: RedirectAttributes): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in updating the owner.")
            return VIEWS_OWNER_CREATE_ORUPDATE_FORM
        }

        val pathOwnerId = "${ownerId}"
        if (owner.id != pathOwnerId.toIntOrNull() ?: 0) { // Check for mismatch, but note: original logic uses a redirect with placeholder
            result.rejectValue("id", "mismatch", "The owner ID in the form does not match the URL.")
            redirectAttributes.addFlashAttribute("error", "Owner ID mismatch. Please try again.")
            return "redirect:/owners/$pathOwnerId/edit"
        }

        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Owner Values Updated")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/{ownerId}")
    fun showOwner(@PathVariable ownerId: Int, model: Model): ModelAndView {
        val optionalOwner = owners.findById(ownerId)
        val owner = if (optionalOwner.isPresent) optionalOwner.get() else throw IllegalArgumentException("Owner not found with id: ${ownerId}. Please ensure the ID is correct")
        return ModelAndView("owners/ownerDetails", "owner" to owner)
    }
}