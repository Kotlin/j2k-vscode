package org.springframework.samples.petclinic.owner

import java.util.List
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Page
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.servlet.ModelAndView
import org.springframework.web.servlet.mvc.support.RedirectAttributes
import jakarta.validation.Valid

@Controller
class OwnerController(private val owners: OwnerRepository) {

    private companion object {
        const val VIEWS_OWNER_CREATE_OR_UPDATE_FORM = "owners/createOrUpdateOwnerForm"
    }

    @InitBinder
    fun setAllowedFields(binder: WebDataBinder) {
        binder.setDisallowedFields("id")
    }

    @ModelAttribute("owner")
    fun findOwner(@PathVariable(name = "ownerId", required = false) ownerId: Int?): Owner {
        return when (ownerId) {
            null -> Owner()
            else -> owners.findById(ownerId)
                .orElseThrow { IllegalArgumentException("Owner not found with id: ${ownerId}. Please ensure the ID is correct and the owner exists in the database.") }
        }
    }

    @GetMapping("/owners/new")
    fun initCreationForm(): String = VIEWS_OWNER_CREATE_OR_UPDATE_FORM

    @PostMapping("/owners/new")
    fun processCreationForm(@Valid owner: Owner, result: BindingResult, redirectAttributes: RedirectAttributes): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in creating the owner.")
            return VIEWS_OWNER_CREATE_OR_UPDATE_FORM
        }

        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "New Owner Created")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/find")
    fun initFindForm(): String = "owners/findOwners"

    @GetMapping("/owners")
    fun processFindForm(@RequestParam(defaultValue = "1") page: Int, owner: Owner, result: BindingResult, model: Model): String {
        if (owner.lastName.isNullOrEmpty()) {
            owner.lastName = ""
        }

        val ownersResults = findPaginatedForOwnersLastName(page - 1, owner.lastName)
        if (ownersResults.isEmpty) {
            result.rejectValue("lastName", "notFound", "not found")
            return initFindForm()
        }

        if (ownersResults.totalElements == 1L) {
            model.addAttribute("owner", ownersResults.content.firstOrNull())
            return "redirect:/owners/${ownersResults.content.firstOrNull()?.id}"
        }

        addPaginationModel(model, ownersResults)
        return "owners/ownersList"
    }

    private fun findPaginatedForOwnersLastName(page: Int, lastname: String): Page<Owner> {
        val pageSize = 5
        val pageable: Pageable = PageRequest.of(page - 1, pageSize)
        return owners.findByLastNameStartingWith(lastname, pageable)
    }

    private fun addPaginationModel(model: Model, paginated: Page<Owner>): String {
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listOwners", paginated.content)
        return "owners/ownersList"
    }

    @GetMapping("/owners/{ownerId}/edit")
    fun initUpdateOwnerForm(): String = VIEWS_OWNER_CREATE_OR_UPDATE_FORM

    @PostMapping("/owners/{ownerId}/edit")
    fun processUpdateOwnerForm(
        @Valid owner: Owner,
        result: BindingResult,
        @PathVariable("ownerId") ownerId: Int,
        redirectAttributes: RedirectAttributes
    ): String {
        if (result.hasErrors()) {
            redirectAttributes.addFlashAttribute("error", "There was an error in updating the owner.")
            return VIEWS_OWNER_CREATE_OR_UPDATE_FORM
        }

        // Check for mismatch between form's owner id and path variable
        if (owner.id != ownerId) {
            result.rejectValue("id", "mismatch", "The owner ID in the form does not match the URL.")
            redirectAttributes.addFlashAttribute("error", "Owner ID mismatch. Please try again.")
            return initUpdateOwnerForm()
        }

        // If no errors and id matches, then update
        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Owner Values Updated")
        return "redirect:/owners/${owner.id}"
    }

    @GetMapping("/owners/{ownerId}")
    fun showOwner(@PathVariable ownerId: Int): ModelAndView {
        val owner = owners.findById(ownerId)
            .orElseThrow { IllegalArgumentException("Owner not found with id: ${ownerId}. Please ensure the ID is correct") }
        
        return ModelAndView("owners/ownerDetails").addObject("owner", owner)
    }

}